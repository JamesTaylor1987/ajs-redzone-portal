import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";

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

interface PageProps {
  searchParams: { stage?: string };
}

export default async function CRMPage({ searchParams }: PageProps) {
  const supabase = getServiceClient();
  const activeStage = searchParams.stage ?? null;

  let prospectsData;
  if (activeStage) {
    const { data } = await supabase
      .from("crm_prospects")
      .select("id, ref, company_name, industry, stage, owner_name, next_action, next_action_date, updated_at")
      .eq("stage", activeStage)
      .order("updated_at", { ascending: false });
    prospectsData = data;
  } else {
    const { data } = await supabase
      .from("crm_prospects")
      .select("id, ref, company_name, industry, stage, owner_name, next_action, next_action_date, updated_at")
      .neq("stage", "lost")
      .order("updated_at", { ascending: false });
    prospectsData = data;
  }

  const prospects = prospectsData ?? [];

  const { data: actRows } = await supabase
    .from("crm_activities")
    .select("prospect_id");

  const actCounts = (actRows ?? []).reduce((acc: Record<string, number>, r: { prospect_id: string }) => {
    acc[r.prospect_id] = (acc[r.prospect_id] || 0) + 1;
    return acc;
  }, {});

  const { data: contactRows } = await supabase
    .from("crm_contacts")
    .select("prospect_id, name")
    .order("created_at", { ascending: true });

  const firstContact = (contactRows ?? []).reduce((acc: Record<string, string>, r: { prospect_id: string; name: string }) => {
    if (!acc[r.prospect_id]) acc[r.prospect_id] = r.name;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-ajs-dark">Prospects</h1>
        <Link
          href="/admin/crm/new"
          className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
        >
          + Add Lead
        </Link>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/crm"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            !activeStage
              ? "bg-ajs-primary text-white border-ajs-primary"
              : "bg-white border-ajs-light text-ajs-muted hover:border-ajs-primary/40 hover:text-ajs-dark"
          }`}
        >
          Active
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s}
            href={`/admin/crm?stage=${s}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              activeStage === s
                ? "bg-ajs-primary text-white border-ajs-primary"
                : "bg-white border-ajs-light text-ajs-muted hover:border-ajs-primary/40 hover:text-ajs-dark"
            }`}
          >
            {STAGE_LABEL[s]}
          </Link>
        ))}
      </div>

      {!prospects.length ? (
        <div className="bg-white rounded-xl border border-ajs-light p-10 text-center text-ajs-muted text-sm">
          No prospects here yet.{" "}
          <Link href="/admin/crm/new" className="text-ajs-primary font-semibold hover:underline">
            Add the first one
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-3">
            {prospects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/crm/${p.id}`}
                className="block bg-white rounded-xl border border-ajs-light p-4 hover:border-ajs-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-ajs-dark">{p.company_name}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STAGE_COLOUR[p.stage] ?? "bg-slate-100 text-slate-600"}`}>
                    {STAGE_LABEL[p.stage] ?? p.stage}
                  </span>
                </div>
                {firstContact[p.id] && <div className="text-sm text-ajs-muted">{firstContact[p.id]}</div>}
                {p.industry && <div className="text-xs text-ajs-muted">{p.industry}</div>}
                {p.next_action && (
                  <div className="text-xs text-ajs-primary mt-1.5 font-medium">
                    Next: {p.next_action}
                    {p.next_action_date && (
                      <span className="text-ajs-muted font-normal ml-1">
                        ({new Date(p.next_action_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })})
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-3 text-xs text-ajs-muted mt-2">
                  <span>{actCounts[p.id] || 0} {actCounts[p.id] === 1 ? "activity" : "activities"}</span>
                  {p.owner_name && <span>{p.owner_name}</span>}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block bg-white rounded-xl border border-ajs-light overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-ajs-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Key contact</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Next action</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Logs</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Owner</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ajs-light">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ajs-dark">{p.company_name}</div>
                      {p.industry && <div className="text-xs text-ajs-muted">{p.industry}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLOUR[p.stage] ?? "bg-slate-100 text-slate-600"}`}>
                        {STAGE_LABEL[p.stage] ?? p.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ajs-muted">{firstContact[p.id] ?? "—"}</td>
                    <td className="px-4 py-3 text-xs max-w-48">
                      {p.next_action
                        ? <span className="text-ajs-primary">{p.next_action}</span>
                        : <span className="text-ajs-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{actCounts[p.id] || 0}</td>
                    <td className="px-4 py-3 text-xs text-ajs-muted">{p.owner_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/crm/${p.id}`} className="text-xs font-semibold text-ajs-primary hover:underline">
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
