"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { calculateInstallationQuote, type AssessmentInputs } from "@/lib/installation-quote/calculate";
import { sendInstallationBudgetEmail } from "@/lib/email";

export async function saveAssessmentAction(formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();

  const assessment: AssessmentInputs = {
    travel_method: g("travel_method") as AssessmentInputs["travel_method"],
    drive_miles: parseInt(g("drive_miles") || "0", 10),
    travel_days_one_way: parseInt(g("travel_days_one_way") || "0", 10) as 0 | 1 | 2,
    engineer_count: parseInt(g("engineer_count") || "1", 10),
    sensor_count: parseInt(g("sensor_count") || "1", 10),
    working_hours: g("working_hours") as AssessmentInputs["working_hours"],
    site_infrastructure: g("site_infrastructure") as AssessmentInputs["site_infrastructure"],
    long_haul: formData.get("long_haul") === "on",
  };

  const calc = calculateInstallationQuote(assessment);

  const supabase = getServiceClient();
  await supabase.from("installation_quotes").update({
    assessment,
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
  const notes      = g("notes") || null;

  const supabase = getServiceClient();
  const { data: iq } = await supabase
    .from("installation_quotes")
    .select("quote_ref, customer_email, customer_name, company_name, hardware_quote_id, hardware_quote_ref, site_name, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country, required_date")
    .eq("id", id)
    .single();

  if (!iq) return;

  // Fetch hardware items for the PDF
  const { data: itemRows } = iq.hardware_quote_id
    ? await supabase.from("quote_items").select("sku, name, qty").eq("quote_id", iq.hardware_quote_id)
    : { data: [] };

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
    items: (itemRows ?? []).map((i: { sku: string; name: string; qty: number }) => ({
      sku: i.sku, name: i.name, qty: i.qty,
    })),
  });

  await supabase.from("installation_quotes").update({
    budget_from_pence: budgetFrom,
    budget_to_pence:   budgetTo,
    ajs_notes:         notes,
    status:            "quoted",
    quoted_at:         new Date().toISOString(),
    email_sent_at:     new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/installation-quotes/${id}`);
}

