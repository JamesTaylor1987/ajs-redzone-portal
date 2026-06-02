import Link from "next/link";
import { getAuthClient } from "@/lib/supabase-auth";
import { logoutAction } from "@/app/admin/login/actions";

export default async function ManufacturingLayout({ children }: { children: React.ReactNode }) {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return <>{children}</>;

  const role = (session.user.app_metadata?.role as string) ?? "standard";
  const isAdmin = role === "admin" || role === "manager";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-ajs-dark text-white">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-sm tracking-wide">Manufacturing</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/manufacturing/orders" className="text-white/80 hover:text-white transition-colors">
                Work orders
              </Link>
              <Link href="/manufacturing/products" className="text-white/80 hover:text-white transition-colors">
                Products
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            {isAdmin && (
              <Link href="/admin/orders" className="hover:text-white transition-colors">
                Admin ↗
              </Link>
            )}
            <Link href="/portal" className="hover:text-white transition-colors">
              Home
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="hover:text-white transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
