import { getServiceClient } from "@/lib/supabase-server";
import { manufacturingUpdateProductAction } from "./actions";

export const dynamic = "force-dynamic";

const STOCK_OPTIONS = [
  "In Stock",
  "Limited Stock",
  "On Order",
  "Discontinued",
];

const STOCK_COLOUR: Record<string, string> = {
  "In Stock":      "bg-emerald-100 text-emerald-700",
  "Limited Stock": "bg-amber-100 text-amber-700",
  "On Order":      "bg-rose-100 text-rose-700",
  "Discontinued":  "bg-slate-100 text-slate-500",
};

export default async function WorkshopProductsPage() {
  const supabase = getServiceClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, sku, name, category, stock_status, lead_time, active")
    .order("sort_order", { ascending: true });

  const active = (products ?? []).filter((p) => p.active);
  const inactive = (products ?? []).filter((p) => !p.active);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-ajs-dark">Products</h1>
        <p className="text-sm text-ajs-muted mt-1">Update stock availability and lead times.</p>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Active products</h2>
        </div>
        {!active.length ? (
          <div className="p-8 text-center text-ajs-muted text-sm">No active products.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-ajs-light">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">SKU</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Stock status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Lead time</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ajs-light">
                {active.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-ajs-muted font-bold whitespace-nowrap">{p.sku}</td>
                    <td className="px-4 py-3 font-medium text-ajs-text">{p.name}</td>
                    <td className="px-4 py-3" colSpan={3}>
                      <form action={manufacturingUpdateProductAction} className="flex items-center gap-2 flex-wrap">
                        <input type="hidden" name="id" value={p.id} />
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STOCK_COLOUR[p.stock_status] ?? "bg-slate-100 text-slate-600"}`}>
                            {p.stock_status}
                          </span>
                        </div>
                        <select
                          name="stock_status"
                          defaultValue={p.stock_status}
                          className="border border-ajs-light rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                        >
                          {STOCK_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          name="lead_time"
                          defaultValue={p.lead_time ?? ""}
                          placeholder="e.g. 3–5 days"
                          className="border border-ajs-light rounded-md px-2.5 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-md text-xs font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {inactive.length > 0 && (
        <details className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <summary className="px-5 py-3 cursor-pointer text-xs font-bold uppercase tracking-wide text-ajs-muted select-none">
            Inactive products ({inactive.length})
          </summary>
          <div className="overflow-x-auto border-t border-ajs-light">
            <table className="w-full text-sm min-w-[640px] opacity-60">
              <tbody className="divide-y divide-ajs-light">
                {inactive.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ajs-muted font-bold whitespace-nowrap">{p.sku}</td>
                    <td className="px-4 py-3 font-medium text-ajs-text line-through">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{p.stock_status}</td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{p.lead_time}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
