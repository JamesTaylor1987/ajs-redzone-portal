"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateLeadAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ajs-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
    >
      {pending && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

interface Props {
  lead: {
    id: string;
    company_name: string;
    site_name: string | null;
    rz_contact_id: string | null;
    notes: string | null;
    follow_up_date: string | null;
    hardware_quote_ref: string | null;
    lost_reason: string | null;
    status: string;
    end_user_name: string | null;
    end_user_phone: string | null;
    end_user_email: string | null;
  };
  contacts: { id: string; name: string; region: string | null }[];
}

export function LeadForm({ lead, contacts }: Props) {
  const [state, formAction] = useFormState(updateLeadAction, null);

  return (
    <form action={formAction} className="px-4 py-4 space-y-3">
      <input type="hidden" name="id" value={lead.id} />

      {state?.ok && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-semibold">
          Saved
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ajs-dark mb-1">Company name</label>
          <input
            name="company_name"
            defaultValue={lead.company_name}
            required
            className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ajs-dark mb-1">Site name</label>
          <input
            name="site_name"
            defaultValue={lead.site_name ?? ""}
            className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
            placeholder="e.g. Swindon factory"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ajs-dark mb-1">Heard from (RZ rep)</label>
          <select
            name="rz_contact_id"
            defaultValue={lead.rz_contact_id ?? ""}
            className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
          >
            <option value="">Select rep...</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.region ? ` — ${c.region}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ajs-dark mb-1">
            Follow-up date <span className="text-rose-500">*</span>
          </label>
          <input
            name="follow_up_date"
            type="date"
            defaultValue={lead.follow_up_date ?? ""}
            required
            className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={lead.notes ?? ""}
          rows={4}
          className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
          placeholder="What did they say? Updates from follow-up calls..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-ajs-dark mb-1">
          Lost reason <span className="text-ajs-muted font-normal">(required if marking Dead)</span>
        </label>
        <input
          name="lost_reason"
          defaultValue={lead.lost_reason ?? ""}
          className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
          placeholder="e.g. Already have a supplier, no budget, wrong timing..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-ajs-dark mb-1">Hardware quote ref <span className="text-ajs-muted font-normal">(if converted)</span></label>
        <input
          name="hardware_quote_ref"
          defaultValue={lead.hardware_quote_ref ?? ""}
          className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
          placeholder="e.g. Q26-RZ0042"
        />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-2">Site end-user contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Name</label>
            <input name="end_user_name" defaultValue={lead.end_user_name ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" placeholder="Contact name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
            <input name="end_user_phone" type="tel" defaultValue={lead.end_user_phone ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" placeholder="07700 000000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
            <input name="end_user_email" type="email" defaultValue={lead.end_user_email ?? ""} className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary" placeholder="contact@company.com" />
          </div>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
