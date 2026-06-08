import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  quote_submitted: "Quote submitted",
  order_confirmed: "Order confirmed",
};
const STATUS_COLOUR: Record<string, string> = {
  quote_submitted: "bg-amber-100 text-amber-700",
  order_confirmed: "bg-blue-100 text-blue-700",
};

interface PageProps {
  params: { sku: string };
}

interface QuoteItem {
  qty: number;
  quotes: {
    id: string;
    ref: string;
    status: string;
    contact_name: string | null;
    contact_company: string | null;
    site_name: string | null;
    required_date: string | null;
    win_probability: number | null;
  } | null;
}

export default async function PipelineSkuPage({ params }: PageProps) {
  const sku = decodeURIComponent(params.sku);
  const supabase = getServiceClient();

  const [{ data: product }, { data: openItems }, { data: confirmedItems }] = await Promise.all([
    supabase.from("products").select("sku, name, category").eq("sku", sku).single(),
    supabase
      .from("quote_items")
      .select("qty, quotes!inner(id, ref, status, contact_name, contact_company, site_name, required_date, win_probability)")
      .eq("sku", sku)
      .eq("quotes.status", "quote_submitted"),
    supabase
      .from("quote_items")
      .select("qty, quotes!inner(id, ref, status, contact_name, contact_company, site_name, required_date, win_probability)")
      .eq("sku", sku)
      .eq("quotes.status", "order_confirmed"),
  ]);

  if (!product) notFound();

  const allItems = [...(openItems ?? []), ...(confirmedItems ?? [])] as unknown as QuoteItem[];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/pipeline" className="text-ajs-muted text-sm hover:underline">
          ← Pipeline
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{sku}</span>
      </div>

      <div>
        <h1 className="text-xl font-extrabold text-ajs-dark">{product.name}</h1>
        <p className="text-sm text-ajs-muted capitalize mt-0.5">{product.category}</p>
      </div>

      {allItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-ajs-light p-8 text-center text-ajs-muted text-sm">
          No open quotes or confirmed orders for this product.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ajs-light bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Ref</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Customer</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Site</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Win %</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ajs-dark">Required</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {allItems.map((item, i) => {
                const q = item.quotes;
                if (!q) return null;
                return (
                  <tr key={`${q.id}-${i}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ajs-dark">{q.ref}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ajs-text">{q.contact_name}</div>
                      {q.contact_company && <div className="text-xs text-ajs-muted">{q.contact_company}</div>}
                    </td>
                    <td className="px-4 py-3 text-ajs-muted text-xs">{q.site_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOUR[q.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ajs-dark">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-ajs-muted">
                      {q.win_probability !== null ? `${q.win_probability}%` : <span className="text-ajs-light">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-ajs-muted">
                      {q.required_date
                        ? new Date(q.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${q.id}`} className="text-ajs-primary text-xs font-semibold hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
