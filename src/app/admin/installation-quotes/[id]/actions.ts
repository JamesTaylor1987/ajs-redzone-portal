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
    scope: g("scope") as AssessmentInputs["scope"],
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
  const budgetTo   = Math.round(parseFloat(g("budget_to")   || "0") * 100);
  const notes      = g("notes") || null;

  const supabase = getServiceClient();
  const { data: iq } = await supabase
    .from("installation_quotes")
    .select("quote_ref, customer_email, customer_name, company_name, hardware_quote_ref")
    .eq("id", id)
    .single();

  if (!iq) return;

  await sendInstallationBudgetEmail({
    quoteRef: iq.quote_ref,
    hardwareRef: iq.hardware_quote_ref,
    customerEmail: iq.customer_email,
    customerName: iq.customer_name ?? "there",
    companyName: iq.company_name,
    budgetFromPence: budgetFrom,
    budgetToPence: budgetTo,
    notes,
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
