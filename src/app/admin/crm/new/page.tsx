import Link from "next/link";
import { createProspectAction } from "../actions";

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

export default function NewProspectPage() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Back
        </Link>
        <h1 className="text-xl font-extrabold text-ajs-dark">Add Lead</h1>
      </div>

      <form action={createProspectAction} className="space-y-5">
        {/* Company */}
        <div className="bg-white rounded-xl border border-ajs-light p-5 space-y-4">
          <h2 className="font-bold text-ajs-dark text-sm uppercase tracking-wide">Company</h2>

          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">
              Company name <span className="text-rose-500">*</span>
            </label>
            <input
              name="company_name"
              required
              autoFocus
              className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              placeholder="e.g. Acme Foods Ltd"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Industry</label>
              <select
                name="industry"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="">Select...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Stage</label>
              <select
                name="stage"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="prospect">Prospect</option>
                <option value="conversation">Conversation</option>
                <option value="proposal">Proposal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Website</label>
            <input
              name="website"
              type="url"
              className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">Owner</label>
            <input
              name="owner_name"
              defaultValue="Noah"
              className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
            />
          </div>
        </div>

        {/* Key contact (optional) */}
        <div className="bg-white rounded-xl border border-ajs-light p-5 space-y-4">
          <h2 className="font-bold text-ajs-dark text-sm uppercase tracking-wide">Key contact <span className="text-ajs-muted font-normal normal-case text-xs">(optional)</span></h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Name</label>
              <input
                name="contact_name"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
              <input
                name="contact_role"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Operations Manager"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
              <input
                name="contact_phone"
                type="tel"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="07..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
              <input
                name="contact_email"
                type="email"
                className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="jane@..."
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-ajs-light p-5">
          <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes <span className="text-ajs-muted font-normal">(optional)</span></label>
          <textarea
            name="notes"
            rows={3}
            className="w-full border border-ajs-light rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
            placeholder="How did we find them? What's the opportunity?"
          />
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
