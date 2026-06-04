import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending:  "Pending assessment",
  assessed: "Assessed — not sent",
  quoted:   "Budget sent",
  declined: "Declined",
};

const STATUS_COLOUR: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  assessed: "bg-blue-100 text-blue-700",
  quoted:   "bg-green-100 text-green-700",
  declined: "bg-rose-100 text-rose-600",
};

export default async function InstallationQuotesPage() {
  const auth = getAuthClient();
  const { data: { session } } = await auth.auth.getSession();
  if (!session) redirect("/admin/login");

  const supabase = getServiceClient();
  const { data: rows } = await supabase
    .from("installation_quotes")
    .select("id, quote_ref, hardware_quote_ref, customer_name, company_name, site_country, status, created_at, budget_from_pence, budget_to_pence")
    .order("created_at", { ascending: false });

  const gbp = (p: number | null) =>
    p == null ? "—" : "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-ajs-dark">Installation Quotes</h1>
      <p className="text-sm text-ajs-muted">
        Requests where the customer ticked &ldquo;Request an installation quote&rdquo; at checkout.
        Open each one to run the budget assessment and send a quote.
      </p>

      {!rows?.length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-10 text-center text-ajs-muted text-sm">
          No installation quote requests yet.
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/admin/installation-quotes/${r.id}`}
                className="block bg-white rounded-xl border border-ajs-light p-4 hover:border-ajs-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-ajs-dark">{r.quote_ref}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOUR[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <div className="font-semibold text-sm">{r.customer_name}</div>
                {r.company_name && <div className="text-xs text-ajs-muted">{r.company_name}</div>}
                <div className="text-xs text-ajs-muted mt-1">
                  {r.site_country} &middot; HW: {r.hardware_quote_ref ?? "—"} &middot;{" "}
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block bg-white rounded-xl border border-ajs-light overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-ajs-light">
                <tr>
                  {["Ref", "Customer", "Country", "HW Quote", "Budget estimate", "Status", "Received", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ajs-light">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ajs-dark">{r.quote_ref}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.customer_name}</div>
                      {r.company_name && <div className="text-xs text-ajs-muted">{r.company_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-ajs-muted text-xs">{r.site_country ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ajs-muted">{r.hardware_quote_ref ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-ajs-dark">
                      {r.budget_from_pence != null ? `${gbp(r.budget_from_pence)} – ${gbp(r.budget_to_pence)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ajs-muted text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/installation-quotes/${r.id}`} className="text-xs font-semibold text-ajs-primary hover:underline">
                        Assess →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
