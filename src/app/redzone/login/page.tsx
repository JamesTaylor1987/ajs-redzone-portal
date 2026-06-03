import { rzLoginAction } from "./actions";

export const dynamic = "force-dynamic";

const RZ_ICON = "https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg";

interface PageProps {
  searchParams: { error?: string };
}

export default function RedzoneLoginPage({ searchParams }: PageProps) {
  const errorMsg = searchParams.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #3f0000 0%, #7f1d1d 55%, #b91c1c 100%)" }}>
      <div className="w-full max-w-sm">
        {/* Logo above card */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={RZ_ICON} alt="Redzone" className="h-10 w-10 drop-shadow-lg" />
          <div className="text-white">
            <div className="text-2xl font-extrabold leading-tight tracking-tight">Redzone</div>
            <div className="text-xs font-semibold text-white/60 uppercase tracking-widest">PM Portal</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#b91c1c] px-6 py-4">
            <p className="text-white/80 text-sm font-medium">Project Manager login</p>
          </div>
          <form action={rzLoginAction} className="p-6 space-y-4">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50"
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
