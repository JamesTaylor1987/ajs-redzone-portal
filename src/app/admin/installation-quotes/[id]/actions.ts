"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { calculateInstallationQuote, type AssessmentInputs, type InstallConfig } from "@/lib/installation-quote/calculate";
import { INSTALL_CONFIG } from "@/lib/installation-quote/config";
import { INSTALL_RATE_KEYS } from "@/lib/installation-quote/settings-keys";
import { sendInstallationBudgetEmail } from "@/lib/email";

export async function saveAssessmentAction(formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();

  const assessment: AssessmentInputs = {
    travel_method: g("travel_method") as AssessmentInputs["travel_method"],
    drive_miles: parseInt(g("drive_miles") || "0", 10),
    travel_days_one_way: parseInt(g("travel_days_one_way") || "0", 10) as 0 | 1 | 2,
    is_international: formData.get("is_international") === "on",
    sensor_count: parseInt(g("sensor_count") || "0", 10),
    include_vf: formData.get("include_vf") === "on",
    vf_item_count: parseInt(g("vf_item_count") || "0", 10),
    working_hours: g("working_hours") as AssessmentInputs["working_hours"],
    site_infrastructure: g("site_infrastructure") as AssessmentInputs["site_infrastructure"],
  };

  const supabase = getServiceClient();

  const { data: rateRows } = await supabase
    .from("settings").select("key, value").in("key", [...INSTALL_RATE_KEYS]);
  const r = Object.fromEntries((rateRows ?? []).map((row: { key: string; value: string }) => [row.key, row.value]));
  const rn = (k: string, def: number) => { const v = parseInt(r[k]); return isNaN(v) ? def : v; };

  const config: InstallConfig = {
    pair_day_rate_pence:         rn("install_pair_day_rate",          INSTALL_CONFIG.pair_day_rate_pence),
    hotel_rate_pence:            rn("install_hotel_rate",             INSTALL_CONFIG.hotel_rate_pence),
    mileage_rate_pence_per_mile: rn("install_mileage_rate",           INSTALL_CONFIG.mileage_rate_pence_per_mile),
    sensors_per_pair_per_day:    rn("install_sensors_per_day",        INSTALL_CONFIG.sensors_per_pair_per_day),
    displays_per_pair_per_day:   rn("install_displays_per_day",       INSTALL_CONFIG.displays_per_pair_per_day),
    eurotunnel_pence:            rn("install_eurotunnel",             INSTALL_CONFIG.eurotunnel_pence),
    flight_estimate_europe_pence: rn("install_flight_europe",         INSTALL_CONFIG.flight_estimate_europe_pence),
    contingency_low:             rn("install_contingency_low",        Math.round(INSTALL_CONFIG.contingency_low * 100)) / 100,
    contingency_high:            rn("install_contingency_high",       Math.round(INSTALL_CONFIG.contingency_high * 100)) / 100,
    out_of_hours_multiplier:     rn("install_out_of_hours_multiplier", Math.round(INSTALL_CONFIG.out_of_hours_multiplier * 100)) / 100,
    partial_infra_uplift_pence:  rn("install_partial_infra_uplift",   INSTALL_CONFIG.partial_infra_uplift_pence),
    no_infra_uplift_pence:       rn("install_no_infra_uplift",        INSTALL_CONFIG.no_infra_uplift_pence),
  };

  const containment_notes = (formData.get("containment_notes") as string ?? "").trim() || null;

  const calc = calculateInstallationQuote(assessment, config);
  await supabase.from("installation_quotes").update({
    assessment,
    containment_notes,
    calc_install_days:       calc.install_days,
    calc_total_days:         calc.total_days,
    calc_labour_pence:       calc.labour_pence,
    calc_travel_pence:       calc.travel_pence,
    calc_hotels_pence:       calc.hotels_pence,
    calc_infra_uplift_pence: calc.infra_uplift_pence,
    calc_subtotal_pence:     calc.subtotal_pence,
    calc_low_pence:          calc.budget_low_pence,
    calc_high_pence:         calc.budget_high_pence,
    budget_from_pence:       calc.budget_low_pence,
    budget_to_pence:         calc.budget_high_pence,
    status: "assessed",
    assessed_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/installation-quotes/${id}`);
}

export async function sendInstallQuoteAction(formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();

  const budgetFrom = Math.round(parseFloat(g("budget_from") || "0") * 100);
  const budgetToVal = parseFloat(g("budget_to") || "0");
  const budgetTo = budgetToVal > 0 ? Math.round(budgetToVal * 100) : budgetFrom;
  const notes         = g("notes") || null;
  const payment_terms = g("payment_terms") || null;

  const supabase = getServiceClient();
  const { data: iq } = await supabase
    .from("installation_quotes")
    .select("quote_ref, customer_email, customer_name, company_name, hardware_quote_id, hardware_quote_ref, site_name, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country, required_date, containment_notes")
    .eq("id", id)
    .single();

  if (!iq) return;

  const [itemsResult, localeResult] = await Promise.all([
    iq.hardware_quote_id
      ? supabase.from("quote_items").select("sku, name, qty").eq("quote_id", iq.hardware_quote_id)
      : Promise.resolve({ data: [] }),
    iq.hardware_quote_id
      ? supabase.from("quotes").select("locale").eq("id", iq.hardware_quote_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const itemRows = itemsResult.data;
  const hardwareLocale = (localeResult.data as { locale?: string | null } | null)?.locale ?? null;

  await sendInstallationBudgetEmail({
    quoteRef: iq.quote_ref,
    hardwareRef: iq.hardware_quote_ref,
    customerEmail: iq.customer_email,
    customerName: iq.customer_name ?? "there",
    companyName: iq.company_name,
    siteName: iq.site_name,
    siteAddressLine1: iq.site_address_line1,
    siteAddressLine2: iq.site_address_line2,
    siteAddressCity: iq.site_address_city,
    siteAddressPostcode: iq.site_address_postcode,
    siteCountry: iq.site_country,
    requiredDate: iq.required_date,
    budgetFromPence: budgetFrom,
    budgetToPence: budgetTo,
    notes,
    containmentNotes: iq.containment_notes ?? null,
    paymentTerms: payment_terms,
    locale: hardwareLocale,
    items: (itemRows ?? []).map((i: { sku: string; name: string; qty: number }) => ({
      sku: i.sku, name: i.name, qty: i.qty,
    })),
  });

  await supabase.from("installation_quotes").update({
    budget_from_pence: budgetFrom,
    budget_to_pence:   budgetTo,
    ajs_notes:         notes,
    payment_terms,
    status:            "quoted",
    quoted_at:         new Date().toISOString(),
    email_sent_at:     new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/installation-quotes/${id}`);
}
