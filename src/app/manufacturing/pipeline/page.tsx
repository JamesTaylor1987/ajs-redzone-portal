import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface ProductRow {
  sku: string;
  name: string;
  openQty: number;
  confirmedQty: number;
  forecastQty: number;
}

export default async function ManufacturingPipelinePage() {
  const supabase = getServiceClient();

  const [{ data: openItems }, { data: confirmedItems }] = await Promise.all([
    supabase
      .from("quote_items")
      .select("sku, name, qty, quotes!inner(win_probability)")
      .eq("quotes.status", "quote_submitted"),
    supabase
      .from("quote_items")
      .select("sku, name, qty")
      .eq("quotes.status", "order_confirmed")
      .not("quotes", "is", null),
  ]);

  // Aggregate open quotes
  const openMap = new Map<string, { name: string; qty: number; forecast: number }>();
  for (const item of openItems ?? []) {
    const prob = (item.quotes as { win_probability: number | null } | null)?.win_probability ?? null;
    const existing = openMap.get(item.sku) ?? { name: item.name, qty: 0, forecast: 0 };
    existing.qty += item.qty;
    if (prob !== null) existing.forecast += item.qty * (prob / 100);
    openMap.set(item.sku, existing);
  }

  // Aggregate confirmed orders
  const confirmedMap = new Map<string, { name: string; qty: number }>();
  for (const item of confirmedItems ?? []) {
    const existing = confirmedMap.get(item.sku) ?? { name: item.name, qty: 0 };
    existing.qty += item.qty;
    confirmedMap.set(item.sku, existing);
  }

  // Merge into unified product list
  const skus = new Set([...openMap.keys(), ...confirmedMap.keys()]);
  const rows: ProductRow[] = [...skus].map((sku) => {
    const open = openMap.get(sku);
    const confirmed = confirmedMap.get(sku);
    const openQty = open?.qty ?? 0;
    const confirmedQty = confirmed?.qty ?? 0;
    return {
      sku,
      name: open?.name ?? confirmed?.name ?? sku,
      openQty,
      confirmedQty,
      forecastQty: Math.round((open?.forecast ?? 0) + confirmedQty),
    };
  }).sort((a, b) => (b.confirmedQty + b.openQty) - (a.confirmedQty + a.openQty));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ajs-dark">Product pipeline</h1>
        <p className="text-sm text-ajs-muted mt-1">
          Open quotes + confirmed orders. Forecast = confirmed + (open × win probability).
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-ajs-light p-8 text-center text-ajs-muted text-sm">
          No products in the pipeline.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ajs-light bg-ajs-bg">
                <th className="text-left px-4 py-3 font-bold text-ajs-dark text-xs uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 font-bold text-ajs-dark text-xs uppercase tracking-wide">Product</th>
                <th className="text-right px-4 py-3 font-bold text-amber-600 text-xs uppercase tracking-wide">Open quotes</th>
                <th className="text-right px-4 py-3 font-bold text-blue-600 text-xs uppercase tracking-wide">Confirmed</th>
                <th className="text-right px-4 py-3 font-bold text-teal-600 text-xs uppercase tracking-wide">Forecast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {rows.map((r) => (
                <tr key={r.sku}>
                  <td className="px-4 py-3 font-mono font-bold text-ajs-dark text-xs">{r.sku}</td>
                  <td className="px-4 py-3 text-ajs-text font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700">
                    {r.openQty > 0 ? r.openQty.toLocaleString() : <span className="text-ajs-light">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {r.confirmedQty > 0 ? r.confirmedQty.toLocaleString() : <span className="text-ajs-light">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-teal-700 text-base">
                    {r.forecastQty > 0 ? r.forecastQty.toLocaleString() : <span className="text-ajs-light">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
