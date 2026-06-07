import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";
import { createLeadAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const supabase = getServiceClient();
  const { data: contacts } = await supabase
    .from("crm_rz_contacts")
    .select("id, name, region")
    .order("name", { ascending: true });

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Leads
        </Link>
        <h1 className="text-xl font-extrabold text-ajs-dark mt-1">Add Lead</h1>
        <p className="text-xs text-ajs-muted mt-0.5">A tip that came through a Redzone rep.</p>
      </div>

      <form action={createLeadAction} className="space-y-4">
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-ajs-light">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">The opportunity</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">
                Company name <span className="text-rose-500">*</span>
              </label>
              <input
                name="company_name"
                required
                autoFocus
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Valeo Foods"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Heard from (RZ rep)</label>
              <select
                name="rz_contact_id"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="">Select rep...</option>
                {(contacts ?? []).map((c: { id: string; name: string; region: string | null }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.region ? ` — ${c.region}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Follow-up date</label>
              <input
                name="follow_up_date"
                type="date"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
                placeholder="What did they say? What's the opportunity?"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-ajs-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Save Lead
        </button>
      </form>
    </div>
  );
}
