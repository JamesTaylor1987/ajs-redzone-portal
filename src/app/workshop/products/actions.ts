"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

export async function workshopUpdateProductAction(formData: FormData): Promise<void> {
  const id = (formData.get("id") as string) ?? "";
  const stockStatus = ((formData.get("stock_status") as string) ?? "").trim();
  const leadTime = ((formData.get("lead_time") as string) ?? "").trim();

  if (!id || !stockStatus) return;

  const supabase = getServiceClient();
  await supabase
    .from("products")
    .update({ stock_status: stockStatus, lead_time: leadTime })
    .eq("id", id);

  revalidatePath("/workshop/products");
}
