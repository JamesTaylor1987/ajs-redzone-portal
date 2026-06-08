import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ManufacturingPipelinePage() {
  const supabase = getServiceClient();

  // Sum qty per product across all open (quote_submitted) quotes
  const { data: items } = await supabase
    .from("quote_items")
    .select("sku, name, qty, quotes!inner(status)")
    .eq("quotes.status", "quote_submitted");

  // Aggregate client-side (Supabase JS doesn't support GROUP BY natively)
  const totals = new Map<string, { sku: string; name: string; qty: number }>();
  for (const item of items ?? []) {
    const existing = totals.get(item.sku);
    if (existing) {
      existing.qty += item.qty;
    } else {
      totals.set(item.sku, { sku: item.sku, name: item.name, qty: item.qty });
    }
  }
  const rows = [...totals.values()].sort((a, b) => b.qty - a.qty);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ajs-dark">Product pipeline</h1>
        <p className="text-sm text-ajs-muted mt-1">
          Quantities on open quotes (status: quote submitted). Does not include confirmed orders or in-build.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-ajs-light p-8 text-center text-ajs-muted text-sm">
          No open quotes in the pipeline.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ajs-light bg-ajs-bg">
                <th className="text-left px-4 py-3 font-bold text-ajs-dark text-xs uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 font-bold text-ajs-dark text-xs uppercase tracking-wide">Product</th>
                <th className="text-right px-4 py-3 font-bold text-ajs-dark text-xs uppercase tracking-wide">Qty on open quotes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {rows.map((r) => (
                <tr key={r.sku}>
                  <td className="px-4 py-3 font-mono font-bold text-ajs-dark">{r.sku}</td>
                  <td className="px-4 py-3 text-ajs-text">{r.name}</td>
                  <td className="px-4 py-3 text-right font-bold text-ajs-dark text-base">{r.qty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
