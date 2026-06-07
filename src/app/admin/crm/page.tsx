import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new:           "New",
  following_up:  "Following up",
  quoted:        "Quoted",
  dead:          "Dead",
};

const STATUS_COLOUR: Record<string, string> = {
  new:          "bg-amber-100 text-amber-700",
  following_up: "bg-blue-100 text-blue-700",
  quoted:       "bg-green-100 text-green-700",
  dead:         "bg-slate-100 text-slate-400",
};

const STATUSES = ["new", "following_up", "quoted", "dead"] as const;

interface PageProps {
  searchParams: { status?: string };
}

export default async function CRMLeadsPage({ searchParams }: PageProps) {
  const supabase = getServiceClient();
  const activeStatus = searchParams.status ?? null;

  let leadsData;
  if (activeStatus) {
    const { data } = await supabase
      .from("crm_leads")
      .select("id, company_name, status, follow_up_date, notes, hardware_quote_ref, rz_contact_id, created_at")
      .eq("status", activeStatus)
      .order("follow_up_date", { ascending: true, nullsFirst: false });
    leadsData = data;
  } else {
    const { data } = await supabase
      .from("crm_leads")
      .select("id, company_name, status, follow_up_date, notes, hardware_quote_ref, rz_contact_id, created_at")
      .in("status", ["new", "following_up"])
      .order("follow_up_date", { ascending: true, nullsFirst: false });
    leadsData = data;
  }

  const leads = leadsData ?? [];

  const { data: contacts } = await supabase
    .from("crm_rz_contacts")
    .select("id, name, region");

  const contactMap = Object.fromEntries(
    (contacts ?? []).map((c: { id: string; name: string; region: string | null }) => [c.id, c])
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ajs-dark">Leads</h1>
          <p className="text-xs text-ajs-muted mt-0.5">Tips from Redzone reps &mdash; ring back, qualify, quote.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/crm/contacts"
            className="text-xs font-semibold text-ajs-muted border border-ajs-light bg-white px-3 py-2 rounded-lg hover:border-ajs-primary/40 hover:text-ajs-dark transition-colors"
          >
            RZ People
          </Link>
          <Link
            href="/admin/crm/new"
            className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
          >
            + Add Lead
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/crm"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            !activeStatus
              ? "bg-ajs-primary text-white border-ajs-primary"
              : "bg-white border-ajs-light text-ajs-muted hover:border-ajs-primary/40 hover:text-ajs-dark"
          }`}
        >
          Active
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/crm?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              activeStatus === s
                ? "bg-ajs-primary text-white border-ajs-primary"
                : "bg-white border-ajs-light text-ajs-muted hover:border-ajs-primary/40 hover:text-ajs-dark"
            }`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {!leads.length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-10 text-center text-ajs-muted text-sm">
          No leads yet.{" "}
          <Link href="/admin/crm/new" className="text-ajs-primary font-semibold hover:underline">
            Add the first one
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {leads.map((l) => {
              const contact = l.rz_contact_id ? contactMap[l.rz_contact_id] : null;
              const overdue = l.follow_up_date && l.follow_up_date < today;
              return (
                <Link
                  key={l.id}
                  href={`/admin/crm/${l.id}`}
                  className="block bg-white rounded-xl border border-ajs-light p-4 hover:border-ajs-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-bold text-ajs-dark">{l.company_name}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOUR[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                  {contact && <div className="text-xs text-ajs-muted">via {contact.name}{contact.region ? ` · ${contact.region}` : ""}</div>}
                  {l.follow_up_date && (
                    <div className={`text-xs font-medium mt-1.5 ${overdue ? "text-rose-600" : "text-ajs-primary"}`}>
                      Follow up: {new Date(l.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {overdue && " — overdue"}
                    </div>
                  )}
                  {l.hardware_quote_ref && (
                    <div className="text-xs text-green-700 font-mono mt-1">HW: {l.hardware_quote_ref}</div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-white rounded-xl border border-ajs-light overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-ajs-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Via (RZ rep)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Follow-up</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">HW quote</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ajs-light">
                {leads.map((l) => {
                  const contact = l.rz_contact_id ? contactMap[l.rz_contact_id] : null;
                  const overdue = l.follow_up_date && l.follow_up_date < today;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ajs-dark">{l.company_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ajs-muted">
                        {contact ? (
                          <Link href={`/admin/crm/contacts/${contact.id}`} className="hover:text-ajs-primary hover:underline">
                            {contact.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-xs font-medium ${overdue ? "text-rose-600" : "text-ajs-muted"}`}>
                        {l.follow_up_date
                          ? new Date(l.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                        {overdue && <span className="ml-1 text-rose-500">!</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-green-700">{l.hardware_quote_ref ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/crm/${l.id}`} className="text-xs font-semibold text-ajs-primary hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
