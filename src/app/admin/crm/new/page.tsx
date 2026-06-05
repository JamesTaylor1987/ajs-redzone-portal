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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-ajs-light">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">{title}</h2>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export default function NewProspectPage() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link href="/admin/crm" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Prospects
        </Link>
        <h1 className="text-xl font-extrabold text-ajs-dark mt-1">Add Lead</h1>
      </div>

      <form action={createProspectAction} className="space-y-4">
        <SectionCard title="Company">
          <div>
            <label className="block text-xs font-semibold text-ajs-dark mb-1">
              Company name <span className="text-rose-500">*</span>
            </label>
            <input
              name="company_name"
              required
              autoFocus
              className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              placeholder="e.g. Acme Foods Ltd"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Industry</label>
              <select
                name="industry"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="">Select...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Stage</label>
              <select
                name="stage"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="prospect">Prospect</option>
                <option value="conversation">Conversation</option>
                <option value="proposal">Proposal</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Website</label>
              <input
                name="website"
                type="url"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Owner</label>
              <input
                name="owner_name"
                defaultValue="Noah"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Key contact (optional)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Name</label>
              <input
                name="contact_name"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
              <input
                name="contact_role"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Ops Manager"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
              <input
                name="contact_phone"
                type="tel"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="07..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
              <input
                name="contact_email"
                type="email"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="jane@..."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Notes (optional)">
          <textarea
            name="notes"
            rows={3}
            className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
            placeholder="How did we find them? What's the opportunity?"
          />
        </SectionCard>

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
