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

  // Handle image upload
  let image_url: string | null = null;
  const imageFile = formData.get("image") as File | null;

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `products/${sku.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, imageFile, { upsert: true, contentType: imageFile.type });

    if (uploadError) {
      return { error: `Image upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    image_url = urlData.publicUrl;
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
    ...(image_url ? { image_url } : {}),
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

export async function deleteProductAction(formData: FormData) {
  const id = (formData.get("id") as string) ?? "";
  const supabase = getServiceClient();
  await supabase.from("products").update({ active: false }).eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}
