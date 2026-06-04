export interface ShippingOption {
  label: string;
  country: string;
  ratePence: number | null; // null = EXW
}

// Rates per pallet in GBP pence
const UK_RATE   = 18000; // £180
const IE_RATE   = 24000; // £240
const EU_RATE   = 54000; // £540
const UAE_RATE  = 90000; // £900

export const SHIPPING_OPTIONS: ShippingOption[] = [
  // UK & Ireland
  { label: "United Kingdom (Mainland)",  country: "United Kingdom",   ratePence: UK_RATE  },
  { label: "Ireland",                    country: "Ireland",          ratePence: IE_RATE  },

  // Western Europe
  { label: "Austria",                    country: "Austria",          ratePence: EU_RATE  },
  { label: "Belgium",                    country: "Belgium",          ratePence: EU_RATE  },
  { label: "Denmark",                    country: "Denmark",          ratePence: EU_RATE  },
  { label: "Finland",                    country: "Finland",          ratePence: EU_RATE  },
  { label: "France",                     country: "France",           ratePence: EU_RATE  },
  { label: "Germany",                    country: "Germany",          ratePence: EU_RATE  },
  { label: "Greece",                     country: "Greece",           ratePence: EU_RATE  },
  { label: "Italy",                      country: "Italy",            ratePence: EU_RATE  },
  { label: "Luxembourg",                 country: "Luxembourg",       ratePence: EU_RATE  },
  { label: "Netherlands",               country: "Netherlands",       ratePence: EU_RATE  },
  { label: "Norway",                     country: "Norway",           ratePence: EU_RATE  },
  { label: "Portugal",                   country: "Portugal",         ratePence: EU_RATE  },
  { label: "Spain",                      country: "Spain",            ratePence: EU_RATE  },
  { label: "Sweden",                     country: "Sweden",           ratePence: EU_RATE  },
  { label: "Switzerland",               country: "Switzerland",       ratePence: EU_RATE  },

  // Central & Eastern Europe
  { label: "Bulgaria",                   country: "Bulgaria",         ratePence: EU_RATE  },
  { label: "Croatia",                    country: "Croatia",          ratePence: EU_RATE  },
  { label: "Czech Republic",            country: "Czech Republic",    ratePence: EU_RATE  },
  { label: "Estonia",                    country: "Estonia",          ratePence: EU_RATE  },
  { label: "Hungary",                    country: "Hungary",          ratePence: EU_RATE  },
  { label: "Latvia",                     country: "Latvia",           ratePence: EU_RATE  },
  { label: "Lithuania",                  country: "Lithuania",        ratePence: EU_RATE  },
  { label: "Poland",                     country: "Poland",           ratePence: EU_RATE  },
  { label: "Romania",                    country: "Romania",          ratePence: EU_RATE  },
  { label: "Slovakia",                   country: "Slovakia",         ratePence: EU_RATE  },
  { label: "Slovenia",                   country: "Slovenia",         ratePence: EU_RATE  },

  // Middle East
  { label: "Bahrain",                    country: "Bahrain",          ratePence: UAE_RATE },
  { label: "Kuwait",                     country: "Kuwait",           ratePence: UAE_RATE },
  { label: "Oman",                       country: "Oman",             ratePence: UAE_RATE },
  { label: "Qatar",                      country: "Qatar",            ratePence: UAE_RATE },
  { label: "Saudi Arabia",              country: "Saudi Arabia",      ratePence: UAE_RATE },
  { label: "United Arab Emirates",      country: "United Arab Emirates", ratePence: UAE_RATE },

  // Rest of world — EXW (customer arranges)
  { label: "Australia",                  country: "Australia",        ratePence: null     },
  { label: "Canada",                     country: "Canada",           ratePence: null     },
  { label: "China",                      country: "China",            ratePence: null     },
  { label: "India",                      country: "India",            ratePence: null     },
  { label: "Japan",                      country: "Japan",            ratePence: null     },
  { label: "Malaysia",                   country: "Malaysia",         ratePence: null     },
  { label: "Mexico",                     country: "Mexico",           ratePence: null     },
  { label: "New Zealand",               country: "New Zealand",       ratePence: null     },
  { label: "Nigeria",                    country: "Nigeria",          ratePence: null     },
  { label: "Singapore",                  country: "Singapore",        ratePence: null     },
  { label: "South Africa",              country: "South Africa",      ratePence: null     },
  { label: "South Korea",              country: "South Korea",        ratePence: null     },
  { label: "Thailand",                   country: "Thailand",         ratePence: null     },
  { label: "Turkey",                     country: "Turkey",           ratePence: null     },
  { label: "United States",            country: "United States",      ratePence: null     },
  { label: "Other / Rest of World (EXW)", country: "Other",          ratePence: null     },
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
