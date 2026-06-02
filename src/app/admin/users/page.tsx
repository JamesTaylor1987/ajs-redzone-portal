import { getServiceClient } from "@/lib/supabase-server";
import { InviteForm, RoleSelect, RemoveButton } from "./UserControls";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = getServiceClient();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const users = (data?.users ?? []).sort((a, b) =>
    (a.email ?? "").localeCompare(b.email ?? ""),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-extrabold text-ajs-dark">Users</h1>

      <InviteForm />

      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">
            Current users ({users.length})
          </h2>
        </div>
        {!users.length ? (
          <div className="p-8 text-center text-ajs-muted text-sm">No users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-ajs-light">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Name / Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {users.map((u) => {
                const role = (u.app_metadata?.role as string) ?? "standard";
                const name = (u.user_metadata?.full_name as string) ?? "";
                const confirmed = !!u.email_confirmed_at;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {name && <div className="font-semibold text-ajs-dark">{name}</div>}
                      <div className="text-ajs-muted text-xs">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleSelect userId={u.id} currentRole={role} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${confirmed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {confirmed ? "Active" : "Invite pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RemoveButton userId={u.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
