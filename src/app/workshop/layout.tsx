import Link from "next/link";
import { getAuthClient } from "@/lib/supabase-auth";
import { logoutAction } from "@/app/admin/login/actions";

export default async function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-ajs-dark text-white">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-sm tracking-wide">Workshop</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/workshop/orders" className="text-white/80 hover:text-white transition-colors">
                Work orders
              </Link>
              <Link href="/workshop/products" className="text-white/80 hover:text-white transition-colors">
                Products
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <Link href="/admin/orders" className="hover:text-white transition-colors">
              Admin ↗
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
