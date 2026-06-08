import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface ProductRow {
  sku: string;
  name: string;
  category: string;
  sort_order: number;
  openQty: number;
  confirmedQty: number;
  forecastQty: number;
}

export default async function AdminPipelinePage() {
  const supabase = getServiceClient();

  const [
    { data: products },
    { data: openItems },
    { data: confirmedItems },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, category, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("quote_items")
      .select("sku, qty, quotes!inner(win_probability)")
      .eq("quotes.status", "quote_submitted"),
    supabase
      .from("quote_items")
      .select("sku, qty, quotes!inner(status)")
      .eq("quotes.status", "order_confirmed"),
  ]);

  // Build open aggregations
  const openMap = new Map<string, { qty: number; forecast: number }>();
  for (const item of openItems ?? []) {
    const prob = (item.quotes as { win_probability: number | null } | null)?.win_probability ?? null;
    const existing = openMap.get(item.sku) ?? { qty: 0, forecast: 0 };
    existing.qty += item.qty;
    if (prob !== null) existing.forecast += item.qty * (prob / 100);
    openMap.set(item.sku, existing);
  }

  // Build confirmed aggregations
  const confirmedMap = new Map<string, number>();
  for (const item of confirmedItems ?? []) {
    confirmedMap.set(item.sku, (confirmedMap.get(item.sku) ?? 0) + item.qty);
  }

  // Merge onto products
  const rows: ProductRow[] = (products ?? []).map((p) => {
    const open = openMap.get(p.sku) ?? { qty: 0, forecast: 0 };
    return {
      sku: p.sku,
      name: p.name,
      category: p.category ?? "Uncategorised",
      sort_order: p.sort_order ?? 0,
      openQty: open.qty,
      confirmedQty: confirmedMap.get(p.sku) ?? 0,
      forecastQty: Math.round(open.forecast + (confirmedMap.get(p.sku) ?? 0)),
    };
  });

  // Group by category
  const categoryMap = new Map<string, ProductRow[]>();
  for (const row of rows) {
    const cat = row.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(row);
  }
  const categories = [...categoryMap.entries()].sort(([, a], [, b]) =>
    (a[0]?.sort_order ?? 0) - (b[0]?.sort_order ?? 0)
  );

  const totalOpen      = rows.reduce((s, r) => s + r.openQty, 0);
  const totalConfirmed = rows.reduce((s, r) => s + r.confirmedQty, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-ajs-dark">Product pipeline</h1>
        <p className="text-sm text-ajs-muted mt-1">
          Open quotes + confirmed orders by product. Click a row to see which quotes are contributing.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Open quote units" value={totalOpen} colour="amber" />
        <Stat label="Confirmed order units" value={totalConfirmed} colour="blue" />
        <Stat label="Total demand" value={totalOpen + totalConfirmed} colour="teal" />
      </div>

      {categories.map(([category, catRows]) => (
        <div key={category} className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <div className="px-5 py-3 border-b border-ajs-light bg-slate-50">
            <h2 className="font-bold text-sm text-ajs-dark capitalize">{category}</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ajs-light text-ajs-dark">
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide">Product</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-amber-600">Open quotes</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-blue-600">Confirmed</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-teal-600">Forecast</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {catRows.map((r) => (
                <tr key={r.sku} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-ajs-dark">{r.sku}</td>
                  <td className="px-4 py-3 text-ajs-text font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700">
                    {r.openQty > 0 ? r.openQty : <span className="text-ajs-light">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {r.confirmedQty > 0 ? r.confirmedQty : <span className="text-ajs-light">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-teal-700">
                    {r.forecastQty > 0 ? r.forecastQty : <span className="text-ajs-light">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(r.openQty > 0 || r.confirmedQty > 0) && (
                      <Link
                        href={`/admin/pipeline/${encodeURIComponent(r.sku)}`}
                        className="text-ajs-primary text-xs font-semibold hover:underline"
                      >
                        View quotes →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="text-xs text-ajs-muted">
        Forecast = confirmed qty + (open quote qty × win probability). Only quotes with a probability set contribute to forecast.
      </p>
    </div>
  );
}

function Stat({ label, value, colour }: { label: string; value: number; colour: string }) {
  const colours: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue:  "border-blue-200 bg-blue-50 text-blue-700",
    teal:  "border-teal-200 bg-teal-50 text-teal-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colours[colour]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-extrabold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
