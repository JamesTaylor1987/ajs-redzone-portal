"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

export const INSTALL_RATE_KEYS = [
  "install_engineer_day_rate",
  "install_hotel_rate",
  "install_mileage_rate",
  "install_sensors_per_day",
  "install_contingency_low",
  "install_contingency_high",
  "install_out_of_hours_multiplier",
  "install_partial_infra_uplift",
  "install_no_infra_uplift",
  "install_flight_europe",
  "install_flight_long_haul",
] as const;

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

export async function saveInstallRatesAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const n = (k: string, fallback = 0) => {
    const v = parseFloat(formData.get(k) as string ?? "");
    return isNaN(v) ? fallback : v;
  };

  const supabase = getServiceClient();
  const { error } = await supabase.from("settings").upsert([
    { key: "install_engineer_day_rate",       value: String(Math.round(n("engineer_day_rate") * 100)) },
    { key: "install_hotel_rate",              value: String(Math.round(n("hotel_rate") * 100)) },
    { key: "install_mileage_rate",            value: String(Math.round(n("mileage_rate"))) },
    { key: "install_sensors_per_day",         value: String(Math.round(n("sensors_per_day"))) },
    { key: "install_contingency_low",         value: String(Math.round(n("contingency_low"))) },
    { key: "install_contingency_high",        value: String(Math.round(n("contingency_high"))) },
    { key: "install_out_of_hours_multiplier", value: String(Math.round(n("out_of_hours_multiplier"))) },
    { key: "install_partial_infra_uplift",    value: String(Math.round(n("partial_infra_uplift") * 100)) },
    { key: "install_no_infra_uplift",         value: String(Math.round(n("no_infra_uplift") * 100)) },
    { key: "install_flight_europe",           value: String(Math.round(n("flight_europe") * 100)) },
    { key: "install_flight_long_haul",        value: String(Math.round(n("flight_long_haul") * 100)) },
  ], { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}
