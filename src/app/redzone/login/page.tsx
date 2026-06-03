import { rzLoginAction } from "./actions";

export const dynamic = "force-dynamic";

const RZ_ICON = "https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg";

interface PageProps {
  searchParams: { error?: string };
}

export default function RedzoneLoginPage({ searchParams }: PageProps) {
  const errorMsg = searchParams.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <main className="min-h-screen bg-ajs-dark flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">
          <div className="bg-[#b91c1c] text-white p-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={RZ_ICON} alt="Redzone" className="h-8 w-8" />
            <div>
              <div className="text-xs uppercase tracking-wide text-white/70">Project Manager Login</div>
              <div className="text-2xl font-extrabold mt-0.5">Redzone Portal</div>
            </div>
          </div>
          <form action={rzLoginAction} className="p-6 space-y-4">
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
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40"
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
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40"
              />
            </div>
            <button
              type="submit"
              className="w-full px-5 py-3 rounded-lg font-bold text-white bg-[#b91c1c] hover:bg-red-900 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
