import Link from "next/link";
import { createRZContactAction } from "../../actions";

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

export default function NewRZContactPage() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link href="/admin/crm/contacts" className="text-ajs-muted hover:text-ajs-primary text-sm">
          ← Redzone People
        </Link>
        <h1 className="text-xl font-extrabold text-ajs-dark mt-1">Add Redzone Person</h1>
      </div>

      <form action={createRZContactAction} className="space-y-4">
        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-ajs-light">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Details</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Name <span className="text-rose-500">*</span></label>
              <input
                name="name"
                required
                autoFocus
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="e.g. Yannick Dupont"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
                <input
                  name="role"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                  placeholder="e.g. Regional Sales Manager"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Region</label>
                <select
                  name="region"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
                >
                  <option value="">Select...</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Country Residing</label>
              <select
                name="country"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
              >
                <option value="">Select...</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-ajs-light">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Contact info</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">LinkedIn</label>
              <input
                name="linkedin"
                type="url"
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
                placeholder="How did we meet? Any context..."
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-ajs-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Save
        </button>
      </form>
    </div>
  );
}
