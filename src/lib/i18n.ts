import { messages as enMessages } from "./messages/en";
import { messages as deMessages } from "./messages/de";
import { messages as frMessages } from "./messages/fr";

export type Locale = "en" | "de" | "fr";
export type Messages = typeof enMessages;
export type MessageKey = keyof Messages;

export const LOCALES: Locale[] = ["en", "de", "fr"];
export const LOCALE_FLAGS: Record<Locale, string> = { en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷" };
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", de: "Deutsch", fr: "Français" };
export const LOCALE_COOKIE = "ajs_locale";

const allMessages: Record<Locale, Messages> = {
  en: enMessages,
  de: deMessages,
  fr: frMessages,
};

export function getLocale(cookieValue?: string | null): Locale {
  if (cookieValue === "de" || cookieValue === "fr") return cookieValue;
  return "en";
}

export function getT(locale: Locale) {
  const msgs = allMessages[locale];
  return function t(key: MessageKey, params?: Record<string, string | number>): string {
    const template: string = msgs[key] ?? enMessages[key] ?? String(key);
    if (!params) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
  };
}
