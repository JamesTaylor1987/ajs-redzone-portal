import { getServiceClient } from "@/lib/supabase-server";
import { ColourPicker } from "./ColourPicker";
import { InstallRatesPicker, type InstallRates } from "./InstallRatesPicker";
import { DEFAULT_STOCK_COLOURS } from "@/lib/stock-colours";
import { INSTALL_RATE_KEYS } from "./actions";
import { INSTALL_CONFIG } from "@/lib/installation-quote/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = getServiceClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [
      "stock_color_in_stock",
      "stock_color_low_stock",
      "stock_color_out_of_stock",
      ...INSTALL_RATE_KEYS,
    ]);

  const kv = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  const colours = {
    inStock:    kv["stock_color_in_stock"]     ?? DEFAULT_STOCK_COLOURS.inStock,
    lowStock:   kv["stock_color_low_stock"]    ?? DEFAULT_STOCK_COLOURS.lowStock,
    outOfStock: kv["stock_color_out_of_stock"] ?? DEFAULT_STOCK_COLOURS.outOfStock,
  };

  const p = (k: string, def: number) => { const v = parseInt(kv[k]); return isNaN(v) ? def : v; };

  const installRates: InstallRates = {
    engineer_day_rate:       p("install_engineer_day_rate",       INSTALL_CONFIG.engineer_day_rate_pence)      / 100,
    hotel_rate:              p("install_hotel_rate",              INSTALL_CONFIG.hotel_rate_pence)             / 100,
    mileage_rate:            p("install_mileage_rate",            INSTALL_CONFIG.mileage_rate_pence_per_mile),
    sensors_per_day:         p("install_sensors_per_day",         INSTALL_CONFIG.sensors_per_engineer_per_day),
    contingency_low:         p("install_contingency_low",         Math.round(INSTALL_CONFIG.contingency_low * 100)),
    contingency_high:        p("install_contingency_high",        Math.round(INSTALL_CONFIG.contingency_high * 100)),
    out_of_hours_multiplier: p("install_out_of_hours_multiplier", Math.round(INSTALL_CONFIG.out_of_hours_multiplier * 100)),
    partial_infra_uplift:    p("install_partial_infra_uplift",    INSTALL_CONFIG.partial_infra_uplift_pence)   / 100,
    no_infra_uplift:         p("install_no_infra_uplift",         INSTALL_CONFIG.no_infra_uplift_pence)        / 100,
    flight_europe:           p("install_flight_europe",           INSTALL_CONFIG.flight_estimate_europe_pence) / 100,
    flight_long_haul:        p("install_flight_long_haul",        INSTALL_CONFIG.flight_estimate_long_haul_pence) / 100,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-extrabold text-ajs-dark">Settings</h1>
      <ColourPicker current={colours} />
      <InstallRatesPicker current={installRates} />
    </div>
  );
}
