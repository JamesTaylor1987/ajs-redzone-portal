import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import {
  updateStageAction,
  logActivityAction,
  addContactAction,
  deleteActivityAction,
  deleteContactAction,
  updateProspectDetailsAction,
  updateProspectNotesAction,
  deleteProspectAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  prospect:     "Prospect",
  conversation: "Conversation",
  proposal:     "Proposal",
  lost:         "Lost",
};

const STAGE_COLOUR: Record<string, string> = {
  prospect:     "bg-slate-100 text-slate-600",
  conversation: "bg-blue-100 text-blue-700",
  proposal:     "bg-amber-100 text-amber-700",
  lost:         "bg-rose-100 text-rose-600",
};

const STAGES = ["prospect", "conversation", "proposal", "lost"] as const;

const ACTIVITY_LABEL: Record<string, string> = {
  coffee:     "Coffee / Chat",
  meeting:    "Meeting",
  call:       "Call",
  email:      "Email",
  site_visit: "Site visit",
  demo:       "Demo",
  linkedin:   "LinkedIn",
  other:      "Other",
};

const INDUSTRIES = [
  "Food & Beverage",
  "Pharmaceuticals",
  "Chemical",
  "Manufacturing",
  "Logistics & Warehousing",
  "Healthcare",
  "Energy & Utilities",
  "Automotive",
  "Electronics",
  "Other",
];

interface Props {
  params: { id: string };
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-slate-50 border-b border-ajs-light">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">{children}</h2>
    </div>
  );
}

export default async function ProspectDetailPage({ params }: Props) {
  const supabase = getServiceClient();

  const { data: p } = await supabase
    .from("crm_prospects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!p) notFound();

  const { data: contacts } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("prospect_id", params.id)
    .order("created_at", { ascending: true });

  const { data: activities } = await supabase
    .from("crm_activities")
    .select("*")
    .eq("prospect_id", params.id)
    .order("occurred_at", { ascending: false });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Prospects
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-xl font-extrabold text-ajs-dark">{p.company_name}</h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLOUR[p.stage] ?? "bg-slate-100 text-slate-600"}`}>
            {STAGE_LABEL[p.stage] ?? p.stage}
          </span>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-ajs-muted flex-wrap">
          {p.ref && <span className="font-mono">{p.ref}</span>}
          {p.industry && <span>{p.industry}</span>}
          {p.owner_name && <span>Owner: {p.owner_name}</span>}
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-ajs-primary hover:underline">
              {p.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* Stage */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Pipeline stage</SectionHeader>
        <div className="px-4 py-4 flex gap-2 flex-wrap">
          {STAGES.map((s) => (
            <form key={s} action={updateStageAction}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="stage" value={s} />
              <button
                type="submit"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  p.stage === s
                    ? `${STAGE_COLOUR[s]} border-transparent`
                    : "bg-white border-ajs-light text-ajs-muted hover:border-ajs-primary/40 hover:text-ajs-dark"
                }`}
              >
                {STAGE_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Log Activity */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Log activity</SectionHeader>
        <form action={logActivityAction} className="px-4 py-4 space-y-3">
          <input type="hidden" name="prospect_id" value={p.id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Type</label>
              <select
                name="type"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                {Object.entries(ACTIVITY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Date</label>
              <input
                name="occurred_at"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes <span className="text-rose-500">*</span></label>
            <textarea
              name="notes"
              required
              rows={3}
              className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
              placeholder="What was discussed? Any key takeaways?"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-ajs-primary text-white py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Save Activity
          </button>
        </form>
      </div>

      {/* Activity log */}
      {(activities ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <SectionHeader>
            Activity log ({(activities ?? []).length})
          </SectionHeader>
          <div className="divide-y divide-ajs-light">
            {(activities ?? []).map((a) => (
              <div key={a.id} className="px-4 py-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-ajs-dark bg-slate-100 px-2 py-0.5 rounded">
                      {ACTIVITY_LABEL[a.type] ?? a.type}
                    </span>
                    <span className="text-xs text-ajs-muted">
                      {new Date(a.occurred_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-ajs-dark whitespace-pre-wrap">{a.notes}</p>
                </div>
                <form action={deleteActivityAction} className="shrink-0">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="prospect_id" value={p.id} />
                  <button type="submit" className="text-ajs-muted hover:text-rose-600 transition-colors text-sm leading-none mt-1" title="Delete">
                    &times;
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Contacts ({(contacts ?? []).length})</SectionHeader>

        {(contacts ?? []).length > 0 && (
          <div className="divide-y divide-ajs-light">
            {(contacts ?? []).map((c) => (
              <div key={c.id} className="px-4 py-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ajs-dark">{c.name}</div>
                  {c.role && <div className="text-xs text-ajs-muted">{c.role}</div>}
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-ajs-primary hover:underline">{c.phone}</a>}
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-ajs-primary hover:underline">{c.email}</a>}
                  </div>
                  {c.notes && <div className="text-xs text-ajs-muted mt-1 italic">{c.notes}</div>}
                </div>
                <form action={deleteContactAction} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="prospect_id" value={p.id} />
                  <button type="submit" className="text-ajs-muted hover:text-rose-600 transition-colors text-sm leading-none mt-1" title="Delete">
                    &times;
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-4 bg-slate-50 border-t border-ajs-light space-y-3">
          <p className="text-xs font-semibold text-ajs-muted">Add contact</p>
          <form action={addContactAction} className="space-y-3">
            <input type="hidden" name="prospect_id" value={p.id} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Name <span className="text-rose-500">*</span></label>
                <input name="name" required className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
                <input name="role" className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" placeholder="e.g. Ops Manager" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
                <input name="phone" type="tel" className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
                <input name="email" type="email" className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
              <input name="notes" className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" placeholder="e.g. Decision maker" />
            </div>
            <button type="submit" className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Add contact
            </button>
          </form>
        </div>
      </div>

      {/* Next action & notes */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Next action &amp; notes</SectionHeader>
        <form action={updateProspectNotesAction} className="px-4 py-4 space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Next action</label>
              <input
                name="next_action"
                defaultValue={p.next_action ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Send demo video"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Due date</label>
              <input
                name="next_action_date"
                type="date"
                defaultValue={p.next_action_date ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
            <textarea
              name="notes"
              defaultValue={p.notes ?? ""}
              rows={4}
              className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
              placeholder="Background on the opportunity, any context..."
            />
          </div>
          <button type="submit" className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Save
          </button>
        </form>
      </div>

      {/* Company details */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Company details</SectionHeader>
        <form action={updateProspectDetailsAction} className="px-4 py-4 space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Company name</label>
              <input
                name="company_name"
                defaultValue={p.company_name}
                required
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Industry</label>
              <select
                name="industry"
                defaultValue={p.industry ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="">Select...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Owner</label>
              <input
                name="owner_name"
                defaultValue={p.owner_name ?? "Noah"}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Website</label>
              <input
                name="website"
                type="url"
                defaultValue={p.website ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="https://..."
              />
            </div>
          </div>
          <button type="submit" className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Save changes
          </button>
        </form>
      </div>

      {/* Delete */}
      <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
        <div className="px-4 py-3 bg-rose-50 border-b border-rose-200">
          <h2 className="text-xs font-bold uppercase tracking-wide text-rose-500">Delete prospect</h2>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs text-ajs-muted mb-3">
            Permanently removes this prospect along with all contacts and activity logs.
          </p>
          <form action={deleteProspectAction}>
            <input type="hidden" name="id" value={p.id} />
            <button
              type="submit"
              className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              Delete prospect
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
