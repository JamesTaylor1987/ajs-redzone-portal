import { getServiceClient } from "@/lib/supabase-server";
import { InvitePMForm } from "./InvitePMForm";
import { RemovePMButton } from "./RemovePMButton";
import { RemoveAdminButton } from "./RemoveAdminButton";

export const dynamic = "force-dynamic";

export default async function RedzonePMsPage() {
  const supabase = getServiceClient();

  const [{ data: pms }, { data: { users: allUsers } }] = await Promise.all([
    supabase.from("rz_pms").select("id, name, email, created_at").order("created_at", { ascending: true }),
    supabase.auth.admin.listUsers({ perPage: 500 }),
  ]);

  const admins = (allUsers ?? []).filter(
    (u) => (u.app_metadata?.role as string) === "rz_admin",
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-extrabold text-ajs-dark">Redzone Users</h1>

      <InvitePMForm />

      {/* Project Managers */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Project Managers</h2>
        </div>
        {!pms?.length ? (
          <p className="px-5 py-6 text-sm text-ajs-muted">No PMs added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-ajs-light">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Added</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {pms.map((pm) => (
                <tr key={pm.id}>
                  <td className="px-4 py-3 font-semibold">{pm.name}</td>
                  <td className="px-4 py-3 text-ajs-muted">{pm.email}</td>
                  <td className="px-4 py-3 text-ajs-muted text-xs">
                    {new Date(pm.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RemovePMButton pmId={pm.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Read-only Admins */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Read-only Admins</h2>
        </div>
        {!admins.length ? (
          <p className="px-5 py-6 text-sm text-ajs-muted">No admins added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-ajs-light">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Email</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {admins.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-semibold">
                    {(u.user_metadata?.full_name as string) || "—"}
                  </td>
                  <td className="px-4 py-3 text-ajs-muted">{u.email}</td>
                  <td className="px-4 py-3 text-right">
                    <RemoveAdminButton userId={u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
