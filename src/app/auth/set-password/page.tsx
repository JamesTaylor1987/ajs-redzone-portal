"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Handle hash-based errors from old-style links
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.slice(1));
      const desc = params.get("error_description");
      setError(desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "This link is invalid or has expired.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    if (tokenHash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (verifyError) {
        setError("This link has expired. Ask your administrator for a new one.");
        setSubmitting(false);
        return;
      }
    }

    const { data, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    const role = data?.user?.app_metadata?.role as string | undefined;
    router.push(role === "rz_pm" || role === "rz_admin" ? "/redzone/quotes" : "/admin");
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">
          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">Welcome</div>
            <div className="text-2xl font-extrabold mt-1">Set your password</div>
          </div>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-5 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
              >
                {submitting ? "Setting password…" : "Set password & sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
