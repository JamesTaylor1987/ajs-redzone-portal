import { INSTALL_CONFIG as C } from "./config";

export interface AssessmentInputs {
  travel_method: "drive" | "fly" | "not_sure";
  drive_miles: number;           // 0 if not driving
  travel_days_one_way: 0 | 1 | 2;
  engineer_count: number;
  sensor_count: number;
  scope: "hardware_only" | "hardware_and_commissioning" | "not_sure";
  working_hours: "standard" | "out_of_hours" | "mixed";
  site_infrastructure: "full" | "partial" | "none";
  long_haul: boolean;            // for fly — true = long haul, false = Europe
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

export function calculateInstallationQuote(a: AssessmentInputs): CalcResult {
  const { engineer_count, sensor_count } = a;

  const raw_install_days = Math.ceil(
    sensor_count / (C.sensors_per_engineer_per_day * engineer_count),
  );
  const commissioning_days =
    a.scope === "hardware_and_commissioning" ? C.commissioning_days_per_engineer : 0;
  const install_days = raw_install_days + commissioning_days;

  const travel_days_total = a.travel_days_one_way * 2;
  const total_days = travel_days_total + install_days;

  // Labour
  let labour_pence: number;
  if (a.working_hours === "out_of_hours") {
    labour_pence = Math.round(
      total_days * engineer_count * C.engineer_day_rate_pence * C.out_of_hours_multiplier,
    );
  } else if (a.working_hours === "mixed") {
    const standard = travel_days_total * engineer_count * C.engineer_day_rate_pence;
    const ooh = install_days * engineer_count * C.engineer_day_rate_pence * C.out_of_hours_multiplier;
    labour_pence = Math.round(standard + ooh);
  } else {
    labour_pence = total_days * engineer_count * C.engineer_day_rate_pence;
  }

  // Travel
  let travel_pence = 0;
  if (a.travel_method === "drive" && a.drive_miles > 0) {
    travel_pence = Math.round(a.drive_miles * 2 * engineer_count * C.mileage_rate_pence_per_mile);
  } else if (a.travel_method === "fly") {
    const rate = a.long_haul
      ? C.flight_estimate_long_haul_pence
      : C.flight_estimate_europe_pence;
    travel_pence = rate * engineer_count;
  }

  // Hotels (nights between days — e.g. 3 days = 2 nights)
  const hotel_nights = Math.max(0, total_days - 1);
  const hotels_pence = hotel_nights * engineer_count * C.hotel_rate_pence;

  // Infrastructure uplift
  const infra_uplift_pence =
    a.site_infrastructure === "partial" ? C.partial_infra_uplift_pence :
    a.site_infrastructure === "none"    ? C.no_infra_uplift_pence : 0;

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
