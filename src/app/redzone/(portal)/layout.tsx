import { redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";
import { RedzoneNav } from "../RedzoneNav";

export default async function RedzoneLayout({ children }: { children: React.ReactNode }) {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/redzone/login");

  const role = (session.user.app_metadata?.role as string) ?? "";
  if (role !== "rz_pm" && role !== "rz_admin") redirect("/redzone/login");

  const serviceClient = getServiceClient();
  const { data: pm } = await serviceClient
    .from("rz_pms")
    .select("name")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  const displayName = pm?.name ?? (session.user.user_metadata?.full_name as string) ?? session.user.email ?? "Redzone";

  return (
    <div className="min-h-screen bg-slate-100">
      <RedzoneNav name={displayName} />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
