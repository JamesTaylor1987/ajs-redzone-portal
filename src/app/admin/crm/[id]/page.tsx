import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { updateLeadStatusAction, deleteLeadAction } from "../actions";
import { LeadForm } from "./LeadForm";
import { FollowupsSection } from "./FollowupsSection";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new:          "New",
  following_up: "Following up",
  quoted:       "Quoted",
  dead:         "Dead",
};

const STATUS_COLOUR: Record<string, string> = {
  new:          "bg-amber-100 text-amber-700",
  following_up: "bg-blue-100 text-blue-700",
  quoted:       "bg-green-100 text-green-700",
  dead:         "bg-slate-100 text-slate-400",
};

const STATUSES = ["new", "following_up", "quoted", "dead"] as const;

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

export default async function LeadDetailPage({ params }: Props) {
  const supabase = getServiceClient();

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!lead) notFound();

  const [{ data: contacts }, { data: followups }] = await Promise.all([
    supabase.from("crm_rz_contacts").select("id, name, region").order("name", { ascending: true }),
    supabase.from("lead_followups").select("id, note, created_at").eq("lead_id", params.id).order("created_at", { ascending: false }),
  ]);

  const contact = lead.rz_contact_id
    ? (contacts ?? []).find((c: { id: string }) => c.id === lead.rz_contact_id) ?? null
    : null;

  const today = new Date().toISOString().split("T")[0];
  const overdue = lead.follow_up_date && lead.follow_up_date < today && lead.status !== "quoted" && lead.status !== "dead";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Leads
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-xl font-extrabold text-ajs-dark">{lead.company_name}</h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[lead.status] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABEL[lead.status] ?? lead.status}
          </span>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-ajs-muted flex-wrap">
          {contact && (
            <span>
              via{" "}
              <Link href={`/admin/crm/contacts/${contact.id}`} className="text-ajs-primary hover:underline">
                {contact.name}
              </Link>
              {contact.region ? ` (${contact.region})` : ""}
            </span>
          )}
          {lead.follow_up_date && (
            <span className={overdue ? "text-rose-600 font-semibold" : ""}>
              Follow up: {new Date(lead.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {overdue && " — overdue"}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Status</SectionHeader>
        <div className="px-4 py-4 flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <form key={s} action={updateLeadStatusAction}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  lead.status === s
                    ? `${STATUS_COLOUR[s]} border-transparent`
                    : "bg-white border-ajs-light text-ajs-muted hover:border-ajs-primary/40 hover:text-ajs-dark"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Follow-up log */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Follow-up log</SectionHeader>
        <div className="px-4 py-4">
          <FollowupsSection leadId={lead.id} followups={followups ?? []} />
        </div>
      </div>

      {/* Edit lead details */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Lead details</SectionHeader>
        <LeadForm lead={lead} contacts={contacts ?? []} />
      </div>

      {/* Delete */}
      <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
        <div className="px-4 py-3 bg-rose-50 border-b border-rose-200">
          <h2 className="text-xs font-bold uppercase tracking-wide text-rose-500">Delete lead</h2>
        </div>
        <div className="px-4 py-4">
          <form action={deleteLeadAction}>
            <input type="hidden" name="id" value={lead.id} />
            <button type="submit" className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors">
              Delete lead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
