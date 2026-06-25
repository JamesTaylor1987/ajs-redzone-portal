import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";
import { StatusFilter } from "./StatusFilter";
import { InlineProbabilityForm } from "./InlineProbabilityForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  quote_submitted:  "Quote submitted",
  order_confirmed:  "Order confirmed",
  in_build:         "In build",
  ready_to_ship:    "Ready to ship",
  shipped:          "Shipped",
  complete:         "Complete",
  cancelled:        "Cancelled",
  expired:          "Expired",
  revised:          "Superseded",
};

const STATUS_COLOUR: Record<string, string> = {
  quote_submitted:  "bg-amber-100 text-amber-700",
  order_confirmed:  "bg-blue-100 text-blue-700",
  in_build:         "bg-purple-100 text-purple-700",
  ready_to_ship:    "bg-teal-100 text-teal-700",
  shipped:          "bg-green-100 text-green-700",
  complete:         "bg-slate-100 text-slate-600",
  cancelled:        "bg-rose-100 text-rose-600",
  expired:          "bg-orange-100 text-orange-600",
  revised:          "bg-slate-100 text-slate-400",
};

interface PageProps {
  searchParams: { status?: string };
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const supabase = getServiceClient();

  let query = supabase
    .from("quotes")
    .select(
      "id, ref, status, contact_name, contact_company, contact_email, subtotal_gbp_pence, shipping_gbp_pence, created_at, original_quote_ref, win_probability, win_probability_set_at, invoiced, payment_received, install_requested, install_quote_sent, install_stage",
    )
    .order("created_at", { ascending: false });

  if (searchParams.status === "all_live") {
    query = query.not("status", "in", '("quote_submitted","revised")');
  } else if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  } else {
    // Hide superseded quotes from the default view
    query = query.neq("status", "revised");
  }

  const { data: orders } = await query;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ajs-dark">Orders</h1>
      </div>

      <StatusFilter />

      <div className="bg-white rounded-xl border border-ajs-light shadow-sm overflow-hidden">
        {!orders?.length ? (
          <div className="p-8 text-center text-ajs-muted text-sm">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b border-ajs-light bg-slate-50 text-ajs-dark">
              <tr>
                <Th>Ref</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Win %</Th>
                <Th>Finance</Th>
                <Th>Install</Th>
                <Th>Total</Th>
                <Th>Submitted</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-bold text-ajs-dark">{o.ref}</div>
                    {o.original_quote_ref && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        Rev. of {o.original_quote_ref}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ajs-text">{o.contact_name}</div>
                    {o.contact_company && (
                      <div className="text-xs text-ajs-muted">{o.contact_company}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        STATUS_COLOUR[o.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === "quote_submitted" ? (
                      <InlineProbabilityForm
                        quoteId={o.id}
                        currentProbability={o.win_probability ?? null}
                        updatedAt={o.win_probability_set_at ?? null}
                      />
                    ) : o.win_probability !== null ? (
                      <span className="text-sm font-semibold text-ajs-dark">{o.win_probability}%</span>
                    ) : (
                      <span className="text-ajs-light text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <FinancePill label="Inv" active={o.invoiced} />
                      <FinancePill label="Paid" active={o.payment_received} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <InstallPill
                      requested={o.install_requested}
                      quoteSent={o.install_quote_sent}
                      stage={o.install_stage}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {gbp(Number(o.subtotal_gbp_pence ?? 0) + Number(o.shipping_gbp_pence ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-ajs-muted text-xs">
                    {new Date(o.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-ajs-primary text-xs font-semibold hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InstallPill({ requested, quoteSent, stage }: { requested: boolean; quoteSent: boolean; stage: string | null }) {
  if (!requested) return <span className="text-ajs-light text-sm">—</span>;
  const { label, cls } =
    stage === "complete"   ? { label: "Complete",   cls: "bg-emerald-100 text-emerald-700" } :
    stage === "installing" ? { label: "Installing", cls: "bg-purple-100 text-purple-700" } :
    stage === "accepted"   ? { label: "Accepted",   cls: "bg-teal-100 text-teal-700" } :
    quoteSent              ? { label: "Quote sent", cls: "bg-blue-100 text-blue-700" } :
                             { label: "Requested",  cls: "bg-amber-100 text-amber-700" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function FinancePill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
      }`}
    >
      {active && (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 5l2.5 2.5 4.5-4.5" />
        </svg>
      )}
      {label}
    </span>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function gbp(pence: number | string | null) {
  if (pence == null) return "—";
  return (
    "£" +
    (Number(pence) / 100).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
