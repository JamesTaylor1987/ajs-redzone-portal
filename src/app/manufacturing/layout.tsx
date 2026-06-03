import { getAuthClient } from "@/lib/supabase-auth";
import { MfgNav } from "./MfgNav";

export default async function ManufacturingLayout({ children }: { children: React.ReactNode }) {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return <>{children}</>;

  const role = (session.user.app_metadata?.role as string) ?? "standard";
  const isAdmin = role === "admin" || role === "manager";

  return (
    <div className="min-h-screen bg-slate-100">
      <MfgNav isAdmin={isAdmin} />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
