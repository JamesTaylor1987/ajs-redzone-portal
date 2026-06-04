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
  const lead_time = g("lead_time");
  const sort_order = parseInt(g("sort_order") || "0", 10);
  const active = formData.get("active") === "on";

  if (!sku || !name || !category || isNaN(price_gbp_pence)) {
    return { error: "SKU, name, category and price are required." };
  }

  const supabase = getServiceClient();

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

export async function addProductImageAction(formData: FormData) {
  const productId = formData.get("productId") as string;
  const imageFile = formData.get("image") as File | null;

  if (!productId || !imageFile || imageFile.size === 0) {
    return { error: "No image provided." };
  }

  const supabase = getServiceClient();

  const { count } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  const sortOrder = count ?? 0;

  const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `products/${productId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, imageFile, { upsert: false, contentType: imageFile.type });

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

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
