import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { updateRZContactAction } from "../../../actions";

export const dynamic = "force-dynamic";

const REGIONS = ["EMEA", "Americas", "APAC", "Other"];
const COUNTRIES = ["England", "Ireland", "France", "Germany", "Poland", "America", "Other"];
const LANGUAGES = ["English", "German", "French", "Dutch"];

interface Props {
  params: { id: string };
}

export default async function EditRZContactPage({ params }: Props) {
  const supabase = getServiceClient();

  const { data: contact } = await supabase
    .from("crm_rz_contacts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!contact) notFound();

  const savedLanguages: string[] = contact.languages ?? [];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link
          href={`/admin/crm/contacts/${params.id}`}
          className="text-ajs-muted hover:text-ajs-primary text-sm"
        >
          ← {contact.name}
        </Link>
        <h1 className="text-xl font-extrabold text-ajs-dark mt-1">Edit details</h1>
      </div>

      <form action={updateRZContactAction} className="space-y-4">
        <input type="hidden" name="id" value={contact.id} />

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
                defaultValue={contact.name}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Role</label>
                <input
                  name="role"
                  defaultValue={contact.role ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Region</label>
                <select
                  name="region"
                  defaultValue={contact.region ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
                >
                  <option value="">Select…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Country Residing</label>
                <select
                  name="country"
                  defaultValue={contact.country ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary bg-white"
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Nationality</label>
                <input
                  name="nationality"
                  defaultValue={contact.nationality ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                  placeholder="e.g. British"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Languages spoken</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                {LANGUAGES.map((lang) => (
                  <label key={lang} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name="languages"
                      value={lang}
                      defaultChecked={savedLanguages.includes(lang)}
                      className="rounded border-ajs-light text-ajs-primary focus:ring-ajs-primary/30"
                    />
                    {lang}
                  </label>
                ))}
              </div>
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
                  defaultValue={contact.email ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ajs-dark mb-1">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={contact.phone ?? ""}
                  className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">LinkedIn</label>
              <input
                name="linkedin"
                type="url"
                defaultValue={contact.linkedin ?? ""}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary"
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ajs-dark mb-1">Notes</label>
              <textarea
                name="notes"
                defaultValue={contact.notes ?? ""}
                rows={3}
                className="w-full border border-ajs-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/30 focus:border-ajs-primary resize-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-ajs-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
