import { INSTALL_CONFIG } from "./config";

const TEAM_SIZE = 2; // always a 2-engineer team

export interface InstallConfig {
  pair_day_rate_pence: number;
  hotel_rate_pence: number;
  mileage_rate_pence_per_mile: number;
  sensors_per_pair_per_day: number;
  displays_per_pair_per_day: number;
  eurotunnel_pence: number;
  flight_estimate_europe_pence: number;
  contingency_low: number;
  contingency_high: number;
  out_of_hours_multiplier: number;
  partial_infra_uplift_pence: number;
  no_infra_uplift_pence: number;
}

export interface AssessmentInputs {
  travel_method: "drive" | "eurotunnel" | "fly" | "not_sure";
  drive_miles: number;
  travel_days_one_way: 0 | 1 | 2;
  is_international: boolean;
  staying_away?: boolean;
  sensor_count: number;
  include_vf: boolean;
  vf_item_count: number;
  working_hours: "standard" | "out_of_hours" | "mixed";
  site_infrastructure: "full" | "partial" | "none";
}

export interface CalcResult {
  install_days: number;
  travel_days_total: number;
  total_days: number;
  labour_pence: number;
  travel_pence: number;
  hotels_pence: number;
  infra_uplift_pence: number;
  subtotal_pence: number;
  budget_low_pence: number;
  budget_high_pence: number;
}

export function calculateInstallationQuote(
  a: AssessmentInputs,
  C: InstallConfig = INSTALL_CONFIG,
): CalcResult {
  const sensor_days = a.sensor_count > 0
    ? Math.ceil(a.sensor_count / C.sensors_per_pair_per_day)
    : 0;

  const vf_days = a.include_vf && a.vf_item_count > 0
    ? Math.ceil(a.vf_item_count / C.displays_per_pair_per_day)
    : 0;

  const install_days = Math.max(1, sensor_days + vf_days);

  const travel_days_total = a.travel_days_one_way * 2;
  const total_days = travel_days_total + install_days;

  // Labour — pair rate, no per-engineer multiplier
  let labour_pence: number;
  if (a.working_hours === "out_of_hours") {
    labour_pence = Math.round(total_days * C.pair_day_rate_pence * C.out_of_hours_multiplier);
  } else if (a.working_hours === "mixed") {
    const standard = travel_days_total * C.pair_day_rate_pence;
    const ooh = install_days * C.pair_day_rate_pence * C.out_of_hours_multiplier;
    labour_pence = Math.round(standard + ooh);
  } else {
    labour_pence = total_days * C.pair_day_rate_pence;
  }

  // Travel — mileage per vehicle (return), Eurotunnel adds fixed return tunnel cost
  let travel_pence = 0;
  if (a.travel_method === "drive" && a.drive_miles > 0) {
    travel_pence = Math.round(a.drive_miles * 2 * C.mileage_rate_pence_per_mile);
  } else if (a.travel_method === "eurotunnel") {
    const mileage = a.drive_miles > 0 ? Math.round(a.drive_miles * 2 * C.mileage_rate_pence_per_mile) : 0;
    travel_pence = mileage + C.eurotunnel_pence * 2; // return tunnel crossing
  } else if (a.travel_method === "fly") {
    travel_pence = C.flight_estimate_europe_pence * TEAM_SIZE;
  }

  // Hotels: only when staying away (default true for back-compat with existing assessments)
  const staying_away = a.staying_away !== false;
  const hotel_nights = staying_away ? Math.max(0, total_days - 1) : 0;
  const hotels_pence = hotel_nights * TEAM_SIZE * C.hotel_rate_pence;

  // Infrastructure uplift — excluded for international jobs
  let infra_uplift_pence = 0;
  if (!a.is_international) {
    infra_uplift_pence =
      a.site_infrastructure === "partial" ? C.partial_infra_uplift_pence :
      a.site_infrastructure === "none"    ? C.no_infra_uplift_pence : 0;
  }

  const subtotal_pence = labour_pence + travel_pence + hotels_pence + infra_uplift_pence;
  const budget_low_pence  = Math.round(subtotal_pence * C.contingency_low);
  const budget_high_pence = Math.round(subtotal_pence * C.contingency_high);

  return {
    install_days,
    travel_days_total,
    total_days,
    labour_pence,
    travel_pence,
    hotels_pence,
    infra_uplift_pence,
    subtotal_pence,
    budget_low_pence,
    budget_high_pence,
  };
}
