import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import {
  updateStageAction,
  logActivityAction,
  addContactAction,
  deleteActivityAction,
  deleteContactAction,
  updateProspectAction,
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
type Stage = typeof STAGES[number];

const NEXT_STAGE: Record<string, Stage | null> = {
  prospect:     "conversation",
  conversation: "proposal",
  proposal:     null,
  lost:         null,
};

const PREV_STAGE: Record<string, Stage | null> = {
  prospect:     null,
  conversation: "prospect",
  proposal:     "conversation",
  lost:         null,
};

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

  const nextStage = NEXT_STAGE[p.stage];
  const prevStage = PREV_STAGE[p.stage];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm block mb-1">
            ← All prospects
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-ajs-dark">{p.company_name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLOUR[p.stage] ?? "bg-slate-100 text-slate-600"}`}>
              {STAGE_LABEL[p.stage] ?? p.stage}
            </span>
          </div>
          {p.ref && <div className="font-mono text-xs text-ajs-muted mt-0.5">{p.ref}</div>}
        </div>
      </div>

      {/* Stage progression */}
      <div className="bg-white rounded-xl border border-ajs-light p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-ajs-muted mb-3">Pipeline stage</div>
        <div className="flex gap-2 flex-wrap">
          {STAGES.map((s) => (
            <form key={s} action={updateStageAction}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="stage" value={s} />
              <button
                type="submit"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  p.stage === s
                    ? `${STAGE_COLOUR[s]} ring-2 ring-offset-1 ring-ajs-primary/40`
                    : "bg-slate-50 text-ajs-muted border border-ajs-light hover:border-ajs-primary/30 hover:text-ajs-dark"
                }`}
              >
                {STAGE_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
        {(nextStage || prevStage) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-ajs-light">
            {prevStage && (
              <form action={updateStageAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="stage" value={prevStage} />
                <button type="submit" className="text-xs text-ajs-muted hover:text-ajs-dark px-3 py-1.5 rounded-lg border border-ajs-light hover:border-ajs-primary/30 transition-colors">
                  &larr; Back to {STAGE_LABEL[prevStage]}
                </button>
              </form>
            )}
            {nextStage && (
              <form action={updateStageAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="stage" value={nextStage} />
                <button type="submit" className="text-xs text-white bg-ajs-primary px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-semibold">
                  Move to {STAGE_LABEL[nextStage]} &rarr;
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Log Activity — primary mobile action */}
      <div className="bg-white rounded-xl border border-ajs-light p-5">
        <h2 className="font-bold text-ajs-dark text-sm uppercase tracking-wide mb-4">Log Activity</h2>
        <form action={logActivityAction} className="space-y-3">
          <input type="hidden" name="prospect_id" value={p.id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Type</label>
              <select
                name="type"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
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
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes <span className="text-rose-500">*</span></label>
            <textarea
              name="notes"
              required
              rows={3}
              className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
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

      {/* Activity feed */}
      {(activities ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <div className="px-5 py-4 border-b border-ajs-light">
            <h2 className="font-bold text-ajs-dark text-sm uppercase tracking-wide">
              Activity log <span className="text-ajs-muted font-normal normal-case text-xs ml-1">({activities!.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-ajs-light">
            {(activities ?? []).map((a) => (
              <div key={a.id} className="px-5 py-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
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
                  <button
                    type="submit"
                    className="text-xs text-ajs-muted hover:text-rose-600 transition-colors mt-0.5"
                    title="Delete"
                  >
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
        <div className="px-5 py-4 border-b border-ajs-light">
          <h2 className="font-bold text-ajs-dark text-sm uppercase tracking-wide">
            Contacts <span className="text-ajs-muted font-normal normal-case text-xs ml-1">({(contacts ?? []).length})</span>
          </h2>
        </div>

        {(contacts ?? []).length > 0 && (
          <div className="divide-y divide-ajs-light">
            {(contacts ?? []).map((c) => (
              <div key={c.id} className="px-5 py-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ajs-dark">{c.name}</div>
                  {c.role && <div className="text-xs text-ajs-muted">{c.role}</div>}
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-xs text-ajs-primary hover:underline">{c.phone}</a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs text-ajs-primary hover:underline">{c.email}</a>
                    )}
                  </div>
                  {c.notes && <div className="text-xs text-ajs-muted mt-1 italic">{c.notes}</div>}
                </div>
                <form action={deleteContactAction} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="prospect_id" value={p.id} />
                  <button type="submit" className="text-xs text-ajs-muted hover:text-rose-600 transition-colors mt-0.5" title="Delete">
                    &times;
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-4 bg-slate-50 border-t border-ajs-light">
          <div className="text-xs font-bold text-ajs-muted uppercase tracking-wide mb-3">Add contact</div>
          <form action={addContactAction} className="space-y-3">
            <input type="hidden" name="prospect_id" value={p.id} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Name <span className="text-rose-500">*</span></label>
                <input
                  name="name"
                  required
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
                <input
                  name="role"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                  placeholder="e.g. Ops Manager"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
              <input
                name="notes"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Decision maker, has budget authority"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-ajs-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Add contact
            </button>
          </form>
        </div>
      </div>

      {/* Next action + Notes */}
      <div className="bg-white rounded-xl border border-ajs-light p-5">
        <h2 className="font-bold text-ajs-dark text-sm uppercase tracking-wide mb-4">Next action &amp; notes</h2>
        <form action={updateProspectAction} className="space-y-3">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Next action</label>
              <input
                name="next_action"
                defaultValue={p.next_action ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Send demo video"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Due date</label>
              <input
                name="next_action_date"
                type="date"
                defaultValue={p.next_action_date ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
            <textarea
              name="notes"
              defaultValue={p.notes ?? ""}
              rows={4}
              className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
              placeholder="Background on the opportunity, any context..."
            />
          </div>
          <button
            type="submit"
            className="bg-ajs-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </form>
      </div>

      {/* Company details (edit) */}
      <details className="bg-white rounded-xl border border-ajs-light">
        <summary className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-ajs-muted cursor-pointer select-none">
          Edit company details
        </summary>
        <div className="px-5 pb-5">
          <form action={updateProspectAction} className="space-y-3 mt-2">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Company name</label>
                <input
                  name="company_name"
                  defaultValue={p.company_name}
                  required
                  className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Industry</label>
                <select
                  name="industry"
                  defaultValue={p.industry ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
                >
                  <option value="">Select...</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Owner</label>
                <input
                  name="owner_name"
                  defaultValue={p.owner_name ?? "Noah"}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Website</label>
                <input
                  name="website"
                  type="url"
                  defaultValue={p.website ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-ajs-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Save changes
            </button>
          </form>
        </div>
      </details>

      {/* Danger zone */}
      <details className="bg-white rounded-xl border border-rose-200">
        <summary className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-rose-400 cursor-pointer select-none">
          Danger zone
        </summary>
        <div className="px-5 pb-5">
          <p className="text-xs text-ajs-muted mb-3">Deleting this prospect will remove all contacts and activities permanently.</p>
          <form action={deleteProspectAction} onSubmit={() => window.confirm("Delete this prospect?")}>
            <input type="hidden" name="id" value={p.id} />
            <button
              type="submit"
              className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              Delete prospect
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
