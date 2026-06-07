import { getAuthClient } from "@/lib/supabase-auth";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return <>{children}</>;

  const role = (session.user.app_metadata?.role as string) ?? "standard";
  const isAdmin = role === "admin" || role === "manager";

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminNav email={session.user.email ?? ""} isAdmin={isAdmin} />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
