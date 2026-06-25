// Internal rates — never imported by client components
export const INSTALL_CONFIG = {
  pair_day_rate_pence:         130_700,  // £1,307/day for the 2-engineer team
  hotel_rate_pence:             31_500,  // £315/night per engineer UK (×2 in calc)
  hotel_rate_abroad_pence:      45_000,  // £450/night per engineer abroad (×2 in calc)
  mileage_rate_pence_per_mile:      65,  // 65p/mile (per vehicle, return trip in calc)
  sensors_per_pair_per_day:          4,  // sensors per team per day
  displays_per_pair_per_day:         3,  // VF displays/streamers per team per day
  eurotunnel_pence:             35_000,  // £350 one-way (×2 for return in calc)
  flight_estimate_europe_pence: 30_000,  // £300 per engineer
  contingency_low:                0.90,
  contingency_high:               1.15,
  out_of_hours_multiplier:        1.75,  // 175%
  partial_infra_uplift_pence:  80_000,
  no_infra_uplift_pence:      150_000,
} as const;
