import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function RZContactsPage() {
  const supabase = getServiceClient();

  const { data: contacts } = await supabase
    .from("crm_rz_contacts")
    .select("id, name, role, region, country, email, phone, updated_at")
    .order("name", { ascending: true });

  const { data: actRows } = await supabase
    .from("crm_rz_activities")
    .select("contact_id");

  const actCounts = (actRows ?? []).reduce((acc: Record<string, number>, r: { contact_id: string }) => {
    acc[r.contact_id] = (acc[r.contact_id] || 0) + 1;
    return acc;
  }, {});

  const { data: leadRows } = await supabase
    .from("crm_leads")
    .select("rz_contact_id")
    .in("status", ["new", "following_up"]);

  const leadCounts = (leadRows ?? []).reduce((acc: Record<string, number>, r: { rz_contact_id: string | null }) => {
    if (r.rz_contact_id) acc[r.rz_contact_id] = (acc[r.rz_contact_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm">
            ← Leads
          </Link>
          <h1 className="text-xl font-extrabold text-ajs-dark mt-1">Redzone People</h1>
          <p className="text-xs text-ajs-muted mt-0.5">Global directory of Redzone reps &amp; contacts.</p>
        </div>
        <Link
          href="/admin/crm/contacts/new"
          className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
        >
          + Add Person
        </Link>
      </div>

      {!(contacts ?? []).length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-10 text-center text-ajs-muted text-sm">
          No Redzone contacts yet.{" "}
          <Link href="/admin/crm/contacts/new" className="text-ajs-primary font-semibold hover:underline">
            Add the first one
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {(contacts ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/admin/crm/contacts/${c.id}`}
                className="block bg-white rounded-xl border border-ajs-light p-4 hover:border-ajs-primary/40 transition-colors"
              >
                <div className="font-bold text-ajs-dark">{c.name}</div>
                {c.role && <div className="text-xs text-ajs-muted">{c.role}</div>}
                {(c.region || c.country) && (
                  <div className="text-xs text-ajs-muted">{[c.region, c.country].filter(Boolean).join(", ")}</div>
                )}
                <div className="flex gap-3 text-xs text-ajs-muted mt-2">
                  <span>{actCounts[c.id] || 0} interactions</span>
                  {leadCounts[c.id] ? <span className="text-ajs-primary font-medium">{leadCounts[c.id]} active lead{leadCounts[c.id] > 1 ? "s" : ""}</span> : null}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-white rounded-xl border border-ajs-light overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-ajs-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Interactions</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Active leads</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ajs-light">
                {(contacts ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-ajs-dark">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{c.role ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{[c.region, c.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-0.5">
                        {c.email && <a href={`mailto:${c.email}`} className="text-ajs-primary hover:underline block">{c.email}</a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="text-ajs-muted hover:text-ajs-primary block">{c.phone}</a>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{actCounts[c.id] || 0}</td>
                    <td className="px-4 py-3 text-xs">
                      {leadCounts[c.id]
                        ? <span className="text-ajs-primary font-semibold">{leadCounts[c.id]}</span>
                        : <span className="text-ajs-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/crm/contacts/${c.id}`} className="text-xs font-semibold text-ajs-primary hover:underline">
                        View →
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
