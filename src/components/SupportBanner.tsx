"use client";

import { useT } from "./LocaleProvider";

export function SupportBanner() {
  const t = useT();

  return (
    <div className="bg-ajs-light/60 border border-ajs-light rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
      <div>
        <p className="font-semibold text-ajs-dark">{t("supportTitle")}</p>
        <p className="text-ajs-muted text-xs mt-0.5">{t("supportDesc")}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="tel:01406424954"
          className="px-4 py-2 rounded-lg border border-ajs-light bg-white text-ajs-dark text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          📞 01406 424954
        </a>
        <a
          href="mailto:RZ@ajsspalding.co.uk?subject=AJS%20RZ%20Portal%20Support"
          className="px-4 py-2 rounded-lg bg-ajs-primary text-white text-xs font-semibold hover:bg-ajs-dark transition-colors"
        >
          {t("emailUs")}
        </a>
      </div>
    </div>
  );
}
