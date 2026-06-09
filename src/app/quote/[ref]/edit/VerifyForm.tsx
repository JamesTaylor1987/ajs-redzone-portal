"use client";

import { verifyEmailAction } from "./actions";
import { useT } from "@/components/LocaleProvider";

interface Props {
  quoteRef: string;
  token: string;
}

export function VerifyForm({ quoteRef, token }: Props) {
  const t = useT();

  return (
    <form action={verifyEmailAction} className="space-y-4">
      <input type="hidden" name="quoteRef" value={quoteRef} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark mb-1">
          {t("fieldEmailAddress")}
        </label>
        <input
          type="email"
          name="email"
          required
          autoFocus
          className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          placeholder={t("fieldEmailPlaceholder")}
        />
      </div>
      <button
        type="submit"
        className="w-full px-5 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
      >
        {t("confirmEmailBtn")}
      </button>
    </form>
  );
}
