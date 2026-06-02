import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  order_confirmed: "Order confirmed",
  in_build:        "In build",
  ready_to_ship:   "Ready to ship",
  shipped:         "Shipped",
  complete:        "Complete",
};

const STATUS_COLOUR: Record<string, string> = {
  order_confirmed: "bg-blue-100 text-blue-700",
  in_build:        "bg-purple-100 text-purple-700",
  ready_to_ship:   "bg-teal-100 text-teal-700",
  shipped:         "bg-green-100 text-green-700",
  complete:        "bg-slate-100 text-slate-500",
};

const ACTIVE_STATUSES = ["order_confirmed", "in_build", "ready_to_ship", "shipped"];

export default async function WorkshopOrdersPage() {
  const supabase = getServiceClient();

  const { data: orders } = await supabase
    .from("quotes")
    .select("id, ref, status, contact_name, contact_company, required_date, created_at")
    .in("status", ACTIVE_STATUSES)
    .order("required_date", { ascending: true, nullsFirst: false });

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
                href={`/workshop/orders/${o.id}`}
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
