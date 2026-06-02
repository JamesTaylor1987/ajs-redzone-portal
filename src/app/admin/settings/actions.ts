"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

export interface SettingsState {
  success?: boolean;
  error?: string;
}

export async function saveStockColoursAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const inStock    = (formData.get("stock_color_in_stock") as string) ?? "";
  const lowStock   = (formData.get("stock_color_low_stock") as string) ?? "";
  const outOfStock = (formData.get("stock_color_out_of_stock") as string) ?? "";

  const supabase = getServiceClient();

  const { error } = await supabase.from("settings").upsert([
    { key: "stock_color_in_stock",     value: inStock },
    { key: "stock_color_low_stock",    value: lowStock },
    { key: "stock_color_out_of_stock", value: outOfStock },
  ], { onConflict: "key" });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { success: true };
}
