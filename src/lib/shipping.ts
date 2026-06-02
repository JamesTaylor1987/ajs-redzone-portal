export interface ShippingOption {
  label: string;
  country: string;
  ratePence: number | null; // null = EXW
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { label: "United Kingdom (Mainland)",  country: "United Kingdom",    ratePence: 18000 },
  { label: "Ireland",                     country: "Ireland",           ratePence: 24000 },
  { label: "France",                      country: "France",            ratePence: 54000 },
  { label: "Germany",                     country: "Germany",           ratePence: 54000 },
  { label: "Italy",                       country: "Italy",             ratePence: 54000 },
  { label: "Spain",                       country: "Spain",             ratePence: 54000 },
  { label: "Netherlands",                 country: "Netherlands",       ratePence: 54000 },
  { label: "United Arab Emirates",        country: "United Arab Emirates", ratePence: 90000 },
  { label: "Other Europe",               country: "Other Europe",       ratePence: 54000 },
  { label: "Other / Rest of World (EXW)", country: "Other",            ratePence: null  },
];

export function getShippingRate(country: string): number | null {
  return SHIPPING_OPTIONS.find((o) => o.country === country)?.ratePence ?? null;
}

export function calcPallets(totalQty: number): number {
  return Math.max(1, Math.ceil(totalQty / 10));
}

export function calcShippingPence(country: string, totalQty: number): number | null {
  const rate = getShippingRate(country);
  if (rate === null) return null;
  return calcPallets(totalQty) * rate;
}
