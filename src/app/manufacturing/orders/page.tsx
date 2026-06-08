import Link from "next/link";
import { Suspense } from "react";
import { getServiceClient } from "@/lib/supabase-server";
import { MfgStatusFilter } from "../MfgStatusFilter";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  order_confirmed: "Order confirmed",
  in_build:        "In build",
  ready_to_ship:   "Ready to ship",
};

const STATUS_COLOUR: Record<string, string> = {
  order_confirmed: "bg-blue-100 text-blue-700",
  in_build:        "bg-purple-100 text-purple-700",
  ready_to_ship:   "bg-teal-100 text-teal-700",
};

const WORKSHOP_STATUSES = ["order_confirmed", "in_build", "ready_to_ship"];

interface PageProps {
  searchParams: { status?: string };
}

async function autoCompleteShipped() {
  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("quotes")
    .select("id")
    .eq("status", "shipped")
    .or(`shipped_at.is.null,shipped_at.lte.${cutoff}`);
  if (data?.length) {
    const now = new Date().toISOString();
    for (const q of data) {
      await supabase.from("quotes").update({ status: "complete", completed_at: now }).eq("id", q.id);
    }
  }
}

export default async function ManufacturingOrdersPage({ searchParams }: PageProps) {
  // Auto-complete any shipped orders past the 10-minute threshold
  autoCompleteShipped().catch(() => {});

  const supabase = getServiceClient();

  const activeStatus = searchParams.status && WORKSHOP_STATUSES.includes(searchParams.status)
    ? searchParams.status
    : null;

  let query = supabase
    .from("quotes")
    .select("id, ref, status, contact_name, contact_company, required_date, site_name")
    .order("required_date", { ascending: true, nullsFirst: false });

  if (activeStatus) {
    query = query.eq("status", activeStatus);
  } else {
    query = query.in("status", WORKSHOP_STATUSES);
  }

  const { data: orders } = await query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function urgency(dateStr: string | null) {
    if (!dateStr) return "none";
    const d = new Date(dateStr);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "overdue";
    if (diff <= 7) return "soon";
    return "none";
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-ajs-dark">Work orders</h1>

      <Suspense>
        <MfgStatusFilter />
      </Suspense>

      {!orders?.length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-8 text-center text-ajs-muted text-sm">
          No active work orders.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const u = urgency(o.required_date);
            return (
              <Link
                key={o.id}
                href={`/manufacturing/orders/${o.id}`}
                className="block bg-white rounded-xl border border-ajs-light p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="font-mono font-bold text-ajs-dark text-sm">{o.ref}</span>
                    <p className="text-ajs-text font-medium mt-0.5">
                      {o.contact_name}
                      {o.contact_company && (
                        <span className="text-ajs-muted font-normal"> — {o.contact_company}</span>
                      )}
                    </p>
                    {o.site_name && (
                      <p className="text-xs text-ajs-muted mt-0.5">{o.site_name}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                {o.required_date && (
                  <p className={`text-xs mt-2 font-semibold ${u === "overdue" ? "text-rose-600" : u === "soon" ? "text-amber-600" : "text-ajs-muted"}`}>
                    {u === "overdue" ? "⚠ Overdue — " : u === "soon" ? "⚡ Due soon — " : "Required by "}
                    {new Date(o.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
