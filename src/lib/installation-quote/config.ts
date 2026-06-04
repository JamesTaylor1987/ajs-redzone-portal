// Internal rates — never imported by client components
// Jim to adjust before go-live
export const INSTALL_CONFIG = {
  engineer_day_rate_pence:      85_000,   // £850/day per engineer
  hotel_rate_pence:             12_000,   // £120/night per engineer
  mileage_rate_pence_per_mile:      45,   // 45p/mile
  sensors_per_engineer_per_day:      8,   // default productivity
  commissioning_days_per_engineer:   2,   // extra days if software commissioning
  contingency_low:                0.90,
  contingency_high:               1.15,
  out_of_hours_multiplier:         1.5,
  partial_infra_uplift_pence:  80_000,   // £800 flat
  no_infra_uplift_pence:      150_000,   // £1,500 flat
  flight_estimate_europe_pence: 60_000,  // £600 per engineer
  flight_estimate_long_haul_pence: 120_000, // £1,200 per engineer
} as const;
