import { getServiceClient } from "@/lib/supabase-server";
import { ColourPicker } from "./ColourPicker";
import { DEFAULT_STOCK_COLOURS } from "@/lib/stock-colours";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = getServiceClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["stock_color_in_stock", "stock_color_low_stock", "stock_color_out_of_stock"]);

  const kv = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const current = {
    inStock:    kv["stock_color_in_stock"]     ?? DEFAULT_STOCK_COLOURS.inStock,
    lowStock:   kv["stock_color_low_stock"]    ?? DEFAULT_STOCK_COLOURS.lowStock,
    outOfStock: kv["stock_color_out_of_stock"] ?? DEFAULT_STOCK_COLOURS.outOfStock,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-extrabold text-ajs-dark">Settings</h1>
      <ColourPicker current={current} />
    </div>
  );
}
