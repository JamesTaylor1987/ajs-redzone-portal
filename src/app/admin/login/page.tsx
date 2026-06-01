import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { error?: string };
}

export default function AdminLoginPage({ searchParams }: PageProps) {
  const errorMsg = searchParams.error
    ? decodeURIComponent(searchParams.error)
    : null;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">
          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">Admin</div>
            <div className="text-2xl font-extrabold mt-1">AJS Redzone Portal</div>
          </div>
          <form action={loginAction} className="p-6 space-y-4">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              />
            </div>
            <button
              type="submit"
              className="w-full px-5 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
