import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";

function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? "44" + digits.slice(1) : digits}`;
}
import {
  updateRZContactAction,
  deleteRZContactAction,
  logRZActivityAction,
  deleteRZActivityAction,
} from "../../actions";

export const dynamic = "force-dynamic";

const ACTIVITY_LABEL: Record<string, string> = {
  coffee:     "Coffee / Chat",
  whatsapp:   "WhatsApp",
  call:       "Call",
  meeting:    "Meeting",
  email:      "Email",
  linkedin:   "LinkedIn",
  conference: "Conference",
  other:      "Other",
};

const REGIONS = [
  "EMEA",
  "Americas",
  "APAC",
  "Other",
];

const COUNTRIES = [
  "England",
  "Ireland",
  "France",
  "Germany",
  "Poland",
  "America",
  "Other",
];

const STATUS_COLOUR: Record<string, string> = {
  new:          "bg-amber-100 text-amber-700",
  following_up: "bg-blue-100 text-blue-700",
  quoted:       "bg-green-100 text-green-700",
  dead:         "bg-slate-100 text-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  new:          "New",
  following_up: "Following up",
  quoted:       "Quoted",
  dead:         "Dead",
};

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

export default async function RZContactDetailPage({ params }: Props) {
  const supabase = getServiceClient();

  const { data: contact } = await supabase
    .from("crm_rz_contacts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!contact) notFound();

  const { data: activities } = await supabase
    .from("crm_rz_activities")
    .select("*")
    .eq("contact_id", params.id)
    .order("occurred_at", { ascending: false });

  const { data: leads } = await supabase
    .from("crm_leads")
    .select("id, company_name, status, follow_up_date")
    .eq("rz_contact_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* Header */}
      <div>
        <Link href="/admin/crm/contacts" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Redzone People
        </Link>
        <h1 className="text-xl font-extrabold text-ajs-dark mt-2">{contact.name}</h1>
        <div className="flex gap-x-3 gap-y-1 mt-1 text-xs text-ajs-muted flex-wrap">
          {contact.role && <span>{contact.role}</span>}
          {contact.region && <span>{contact.region}</span>}
          {contact.country && <span>{contact.country}</span>}
          {contact.email && <a href={`mailto:${contact.email}`} className="text-ajs-primary hover:underline break-all">{contact.email}</a>}
          {contact.phone && <a href={`tel:${contact.phone}`} className="text-ajs-primary hover:underline">{contact.phone}</a>}
          {contact.phone && <a href={waHref(contact.phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-semibold">WhatsApp</a>}
          {contact.linkedin && <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-ajs-primary hover:underline">LinkedIn</a>}
        </div>
        {contact.notes && <p className="text-xs text-ajs-muted mt-2 italic break-words">{contact.notes}</p>}
      </div>

      {/* Log interaction — primary mobile action */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Log interaction</SectionHeader>
        <form action={logRZActivityAction} className="px-4 py-4 space-y-3 overflow-hidden">
          <input type="hidden" name="contact_id" value={contact.id} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Type</label>
              <select
                name="type"
                className="w-full max-w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                {Object.entries(ACTIVITY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Date</label>
              <input
                name="occurred_at"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full appearance-none border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Follow-up date <span className="text-ajs-muted font-normal">(when to touch base again)</span></label>
            <input
              name="follow_up_date"
              type="date"
              defaultValue={contact.follow_up_date ?? ""}
              className="w-full appearance-none border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes <span className="text-rose-500">*</span></label>
            <textarea
              name="notes"
              required
              rows={3}
              className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
              placeholder="What was discussed? Any leads mentioned?"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-ajs-primary text-white py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </form>
      </div>

      {/* Interaction log */}
      {(activities ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <SectionHeader>Interaction log ({(activities ?? []).length})</SectionHeader>
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
                <form action={deleteRZActivityAction} className="shrink-0">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="contact_id" value={contact.id} />
                  <button type="submit" className="text-ajs-muted hover:text-rose-600 transition-colors text-sm leading-none mt-1" title="Delete">
                    &times;
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads from this person */}
      {(leads ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <SectionHeader>Leads from {contact.name} ({(leads ?? []).length})</SectionHeader>
          <div className="divide-y divide-ajs-light">
            {(leads ?? []).map((l) => (
              <Link
                key={l.id}
                href={`/admin/crm/${l.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-semibold text-sm text-ajs-dark">{l.company_name}</div>
                  {l.follow_up_date && (
                    <div className="text-xs text-ajs-muted">
                      Follow up: {new Date(l.follow_up_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOUR[l.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Edit details */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <SectionHeader>Edit details</SectionHeader>
        <form action={updateRZContactAction} className="px-4 py-4 space-y-3">
          <input type="hidden" name="id" value={contact.id} />
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Name</label>
            <input name="name" defaultValue={contact.name} required className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
              <input name="role" defaultValue={contact.role ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Region</label>
              <select name="region" defaultValue={contact.region ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white">
                <option value="">Select...</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Country Residing</label>
              <select name="country" defaultValue={contact.country ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white">
                <option value="">Select...</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
              <input name="phone" type="tel" defaultValue={contact.phone ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
              <input name="email" type="email" defaultValue={contact.email ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">LinkedIn</label>
              <input name="linkedin" type="url" defaultValue={contact.linkedin ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
            <textarea name="notes" defaultValue={contact.notes ?? ""} rows={2} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none" />
          </div>
          <button type="submit" className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Save changes
          </button>
        </form>
      </div>

      {/* Delete */}
      <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
        <div className="px-4 py-3 bg-rose-50 border-b border-rose-200">
          <h2 className="text-xs font-bold uppercase tracking-wide text-rose-500">Delete contact</h2>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs text-ajs-muted mb-3">Removes this person and all their interaction history.</p>
          <form action={deleteRZContactAction}>
            <input type="hidden" name="id" value={contact.id} />
            <button type="submit" className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
