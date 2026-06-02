import Link from "next/link";
import { getAuthClient } from "@/lib/supabase-auth";
import { logoutAction } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getAuthClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // No session — render children without nav (middleware already handles redirects).
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="brand-gradient text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-6">
          <span className="font-extrabold text-lg tracking-tight">RZ Admin</span>
          <NavLink href="/admin/orders">Orders</NavLink>
          <NavLink href="/admin/products">Products</NavLink>
          <NavLink href="/admin/users">Users</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/70 text-xs hidden sm:block">
            {session.user.email}
          </span>
          <Link
            href="/manufacturing"
            className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors"
          >
            Manufacturing ↗
          </Link>
          <Link
            href="/"
            className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors"
          >
            ← Site
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-white/80 hover:text-white text-sm font-medium transition-colors"
    >
      {children}
    </Link>
  );
}
