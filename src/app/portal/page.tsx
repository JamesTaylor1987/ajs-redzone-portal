import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { logoutAction } from "@/app/admin/login/actions";

export const dynamic = "force-dynamic";

export default async function PortalHubPage() {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/admin/login");

  const role = (session.user.app_metadata?.role as string) ?? "standard";
  const isElevated = role === "admin" || role === "manager";

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ajsspalding.co.uk/img/ajs-logo@2x.png"
              alt="AJS"
              className="h-7 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-ajs-dark">AJS Redzone Portal</h1>
          <p className="text-sm text-ajs-muted mt-1">{session.user.email}</p>
        </div>

        <div className={`grid gap-4 ${isElevated ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"}`}>
          <Link
            href="/manufacturing"
            className="bg-white rounded-2xl border border-ajs-light p-6 text-center hover:shadow-md hover:border-ajs-primary/40 transition-all group"
          >
            <div className="text-3xl mb-3">🔧</div>
            <div className="font-extrabold text-ajs-dark text-sm group-hover:text-ajs-primary transition-colors">Manufacturing</div>
            <div className="text-xs text-ajs-muted mt-1">Work orders &amp; stock</div>
          </Link>

          {isElevated && (
            <Link
              href="/admin/orders"
              className="bg-white rounded-2xl border border-ajs-light p-6 text-center hover:shadow-md hover:border-ajs-primary/40 transition-all group"
            >
              <div className="text-3xl mb-3">📋</div>
              <div className="font-extrabold text-ajs-dark text-sm group-hover:text-ajs-primary transition-colors">Admin</div>
              <div className="text-xs text-ajs-muted mt-1">Orders, quotes &amp; products</div>
            </Link>
          )}
        </div>

        <div className="text-center">
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-ajs-muted hover:text-ajs-dark transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
