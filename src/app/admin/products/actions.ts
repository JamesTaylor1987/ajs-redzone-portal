"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

export async function upsertProductAction(formData: FormData) {
  const id = (formData.get("id") as string) || null;
  const g = (k: string) => ((formData.get(k) as string) ?? "").trim();

  const sku = g("sku");
  const name = g("name");
  const description = g("description") || null;
  const category = g("category");
  const plc = g("plc") || null;
  const material = g("material") || null;
  const io_count = g("io_count") ? parseInt(g("io_count"), 10) : null;
  const price_gbp_pence = Math.round(parseFloat(g("price_gbp")) * 100);
  const stock_status = g("stock_status");
  const lead_time = g("lead_time") || null;
  let sort_order = parseInt(g("sort_order") || "0", 10);
  const active = formData.get("active") === "on";

  if (!sku || !name || !category || isNaN(price_gbp_pence)) {
    return { error: "SKU, name, category and price are required." };
  }

  const supabase = getServiceClient();

  // Treat sort_order as 1-based position within the category.
  // Re-sequence all products in the category so positions are 10, 20, 30…
  const desiredPosition = Math.max(1, sort_order || 1);

  // Siblings = other products in same category, ordered by current sort_order
  const sibQuery = supabase
    .from("products")
    .select("id, sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: true });
  if (id) sibQuery.neq("id", id);
  const { data: siblings } = await sibQuery;
  const sibs = siblings ?? [];

  // Clamp position to valid range
  const pos = Math.min(desiredPosition, sibs.length + 1);

  // Build ordered list with the current product inserted at pos
  const ordered: string[] = [];
  for (let i = 0; i < sibs.length; i++) {
    if (ordered.length + 1 === pos) ordered.push("__current__");
    ordered.push(sibs[i].id);
  }
  if (!ordered.includes("__current__")) ordered.push("__current__");

  // Assign clean sort_orders (10, 20, 30…) and collect updates for siblings
  let newSortOrder = 10;
  const sibUpdates: { id: string; sort_order: number }[] = [];
  for (const pid of ordered) {
    if (pid === "__current__") {
      sort_order = newSortOrder;
    } else {
      const existing = sibs.find((s) => s.id === pid)!;
      if (existing.sort_order !== newSortOrder) {
        sibUpdates.push({ id: pid, sort_order: newSortOrder });
      }
    }
    newSortOrder += 10;
  }

  // Update any siblings whose sort_order changed
  for (const u of sibUpdates) {
    await supabase.from("products").update({ sort_order: u.sort_order }).eq("id", u.id);
  }

  const payload = {
    sku,
    name,
    description,
    category,
    plc,
    material,
    io_count,
    price_gbp_pence,
    stock_status,
    lead_time,
    sort_order,
    active,
  };

  if (id) {
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("products").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

// Returns a signed upload URL so the browser can upload directly to Supabase
// Storage without going through Vercel (which has a 4.5 MB body limit).
export async function createSignedUploadUrlAction(
  productId: string,
  filename: string,
): Promise<{ path?: string; token?: string; error?: string }> {
  if (!productId || !filename) return { error: "Missing params." };
  const supabase = getServiceClient();
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `products/${productId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("product-images")
    .createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Could not create upload URL." };
  return { path, token: data.token };
}

// Called after direct upload succeeds — saves the public URL to the DB.
export async function registerProductImageAction(
  productId: string,
  path: string,
): Promise<{ success?: boolean; error?: string }> {
  if (!productId || !path) return { error: "Missing params." };
  const supabase = getServiceClient();
  const { count } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);
  const sortOrder = count ?? 0;
  const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
  const url = urlData.publicUrl;
  const { error: insertError } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url, sort_order: sortOrder });
  if (insertError) return { error: insertError.message };
  if (sortOrder === 0) {
    await supabase.from("products").update({ image_url: url }).eq("id", productId);
  }
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}

export async function moveProductImageAction(formData: FormData) {
  const productId = formData.get("productId") as string;
  const imageId = formData.get("imageId") as string;
  const direction = formData.get("direction") as "left" | "right";

  if (!productId || !imageId) return { error: "Missing params." };

  const supabase = getServiceClient();

  const { data: images } = await supabase
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (!images) return { error: "Could not fetch images." };

  const idx = images.findIndex((i) => i.id === imageId);
  if (idx === -1) return { error: "Image not found." };

  const swapIdx = direction === "left" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= images.length) return {};

  const a = images[idx];
  const b = images[swapIdx];

  await supabase.from("product_images").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("product_images").update({ sort_order: a.sort_order }).eq("id", b.id);

  // Re-sync product.image_url to whichever image is now first
  const { data: first } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();
  await supabase.from("products").update({ image_url: first?.url ?? null }).eq("id", productId);

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProductImageAction(formData: FormData) {
  const imageId = formData.get("imageId") as string;
  const productId = formData.get("productId") as string;
  const url = formData.get("url") as string;

  if (!imageId || !productId) return { error: "Missing params." };

  const supabase = getServiceClient();

  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)/);
    if (match) await supabase.storage.from("product-images").remove([match[1]]);
  } catch { /* ignore bad url */ }

  await supabase.from("product_images").delete().eq("id", imageId);

  const { data: remaining } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(1);

  await supabase
    .from("products")
    .update({ image_url: remaining?.[0]?.url ?? null })
    .eq("id", productId);

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProductAction(formData: FormData) {
  const id = (formData.get("id") as string) ?? "";
  const supabase = getServiceClient();
  await supabase.from("products").update({ active: false }).eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}
