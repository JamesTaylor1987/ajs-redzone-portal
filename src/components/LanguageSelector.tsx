"use client";

import { LOCALES, LOCALE_FLAGS, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

export function LanguageSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex bg-white/10 rounded-lg overflow-hidden border border-white/20 text-xs font-semibold">
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          title={LOCALE_NAMES[l]}
          aria-label={LOCALE_NAMES[l]}
          className={`px-2 py-1.5 transition-colors ${
            locale === l ? "bg-white text-ajs-dark" : "text-white/80 hover:bg-white/10"
          }`}
        >
          {LOCALE_FLAGS[l]}
        </button>
      ))}
    </div>
  );
}
