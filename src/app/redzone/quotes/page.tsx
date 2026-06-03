import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  quote_submitted:  "Quote submitted",
  order_confirmed:  "Order confirmed",
  in_build:         "In build",
  ready_to_ship:    "Ready to ship",
  shipped:          "Shipped",
  complete:         "Complete",
  cancelled:        "Cancelled",
  revised:          "Superseded",
};

const STATUS_COLOUR: Record<string, string> = {
  quote_submitted:  "bg-yellow-100 text-yellow-700",
  order_confirmed:  "bg-blue-100 text-blue-700",
  in_build:         "bg-purple-100 text-purple-700",
  ready_to_ship:    "bg-teal-100 text-teal-700",
  shipped:          "bg-green-100 text-green-700",
  complete:         "bg-slate-100 text-slate-500",
  cancelled:        "bg-rose-100 text-rose-600",
  revised:          "bg-slate-100 text-slate-400",
};

export default async function RedzoneQuotesPage() {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/redzone/login");

  const serviceClient = getServiceClient();

  const { data: pm } = await serviceClient
    .from("rz_pms")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single();

  if (!pm) redirect("/redzone/login");

  const { data: quotes } = await serviceClient
    .from("quotes")
    .select("id, ref, status, contact_name, contact_company, required_date, submitted_at")
    .eq("rz_pm_id", pm.id)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-ajs-dark">My Quotes</h1>

      {!quotes?.length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-10 text-center text-ajs-muted text-sm">
          No quotes assigned to you yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-slate-50 border-b border-ajs-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Required by</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ajs-light">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ajs-dark">{q.ref}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{q.contact_name}</div>
                      {q.contact_company && <div className="text-xs text-ajs-muted">{q.contact_company}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[q.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ajs-muted text-xs">
                      {q.required_date
                        ? new Date(q.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-ajs-muted text-xs">
                      {q.submitted_at
                        ? new Date(q.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/redzone/quotes/${q.id}`}
                        className="text-xs font-semibold text-ajs-primary hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
