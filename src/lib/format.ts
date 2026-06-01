import type { Currency } from "./types";

const FX_GBP_TO_EUR_BASE = Number(process.env.NEXT_PUBLIC_FX_GBP_TO_EUR ?? "1.17");
const FX_MARGIN = 1.015; // URS FR-04: live rate + 1.5% margin

export function getFxRate(currency: Currency): number {
  return currency === "EUR" ? FX_GBP_TO_EUR_BASE * FX_MARGIN : 1;
}

export function convertPence(gbpPence: number, currency: Currency): number {
  if (currency === "GBP") return gbpPence;
  return Math.round(gbpPence * getFxRate(currency));
}

const SYMBOL: Record<Currency, string> = { GBP: "£", EUR: "€" };

export function formatMoney(pence: number, currency: Currency = "GBP"): string {
  const converted = convertPence(pence, currency);
  const major = converted / 100;
  return `${SYMBOL[currency]}${major.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatMoneyExact(pence: number, currency: Currency = "GBP"): string {
  const converted = convertPence(pence, currency);
  const major = converted / 100;
  return `${SYMBOL[currency]}${major.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
