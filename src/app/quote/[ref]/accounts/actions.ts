"use server";

import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { sendOrderConfirmationEmails } from "@/lib/email";

export type AcceptAccountsState = { error: string } | null;

export async function acceptAccountsAction(
  _prevState: AcceptAccountsState,
  formData: FormData,
): Promise<AcceptAccountsState> {
  const quoteRef = (formData.get("quoteRef") as string) ?? "";
  const accountsToken = (formData.get("accountsToken") as string) ?? "";

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, ref, status, contact_name, contact_email, contact_phone, contact_company, subtotal_gbp_pence, shipping_gbp_pence, shipping_pallets, required_date, install_requested, accounts_token, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country, currency, fx_rate_used",
    )
    .eq("ref", quoteRef)
    .single();

  if (!quote || quote.accounts_token !== accountsToken) {
    return { error: "Invalid request." };
  }

  if (quote.status !== "quote_submitted") {
    redirect(`/quote/${encodeURIComponent(quoteRef)}/accounts?token=${accountsToken}&done=1`);
  }

  const g = (key: string) => ((formData.get(key) as string) ?? "").trim();

  const registeredCompanyName = g("registeredCompanyName");
  const registeredCompanyAddress = g("registeredCompanyAddress");
  const companyRegistrationNumber = g("companyRegistrationNumber");
  const countryOfRegistration = g("countryOfRegistration");
  const accountContactName = g("accountContactName");
  const accountContactTelephone = g("accountContactTelephone");
  const accountContactEmail = g("accountContactEmail");
  const invoiceEmail = g("invoiceEmail");
  const statementEmail = g("statementEmail");
  const requiresPONumber = formData.get("requiresPONumber") === "yes";
  const vatRegistered = formData.get("vatRegistered") === "yes";
  const vatNumber = g("vatNumber");
  const localTaxNumber = g("localTaxNumber");
  const invoiceAddressDifferent = formData.get("invoiceAddressDifferent") === "on";
  const invoiceAddress = invoiceAddressDifferent ? g("invoiceAddress") : null;
  const gdprConsent = formData.get("gdprConsent") === "on";
  const signatoryName = g("signatoryName");
  const signatoryPosition = g("signatoryPosition");

  const missing: [string, string][] = [
    [registeredCompanyName, "Registered company name is required."],
    [registeredCompanyAddress, "Registered company address is required."],
    [companyRegistrationNumber, "Company registration number is required."],
    [countryOfRegistration, "Country of registration is required."],
    [accountContactName, "Account contact name is required."],
    [accountContactTelephone, "Account contact telephone is required."],
    [accountContactEmail, "Account contact email is required."],
    [invoiceEmail, "Email for invoices is required."],
    [statementEmail, "Email for statements is required."],
    [signatoryName, "Your name is required for GDPR consent."],
    [signatoryPosition, "Your position is required for GDPR consent."],
  ];
  for (const [val, msg] of missing) {
    if (!val) return { error: msg };
  }
  if (vatRegistered && !vatNumber) {
    return { error: "VAT number is required when VAT registered." };
  }
  if (!gdprConsent) {
    return { error: "GDPR consent is required to place an order." };
  }

  const now = new Date().toISOString();

  const accountInfo = {
    registeredCompanyName,
    registeredCompanyAddress,
    invoiceAddressDifferent,
    invoiceAddress: invoiceAddressDifferent ? invoiceAddress : null,
    companyRegistrationNumber,
    countryOfRegistration,
    accountContactName,
    accountContactTelephone,
    accountContactEmail,
    invoiceEmail,
    statementEmail,
    requiresPONumber,
    vatRegistered,
    vatNumber: vatRegistered ? vatNumber : null,
    localTaxNumber: localTaxNumber || null,
    signatory: { name: signatoryName, position: signatoryPosition, date: now },
  };

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      account_info: accountInfo,
      gdpr_consent_at: now,
      status: "order_confirmed",
      accepted_at: now,
    })
    .eq("id", quote.id);

  if (updateError) {
    console.error("[accounts] DB update failed:", updateError);
    return { error: "Could not save your order. Please try again or contact rz@ajsspalding.co.uk." };
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence")
    .eq("quote_id", quote.id);

  await sendOrderConfirmationEmails(
    {
      ref: quote.ref,
      contact_name: quote.contact_name,
      contact_email: quote.contact_email,
      contact_phone: quote.contact_phone,
      contact_company: quote.contact_company,
      subtotal_gbp_pence: quote.subtotal_gbp_pence,
      shipping_gbp_pence: quote.shipping_gbp_pence,
      shipping_pallets: quote.shipping_pallets,
      required_date: quote.required_date,
      install_requested: quote.install_requested,
      site_address_line1: quote.site_address_line1,
      site_address_line2: quote.site_address_line2,
      site_address_city: quote.site_address_city,
      site_address_postcode: quote.site_address_postcode,
      site_country: quote.site_country,
      currency: quote.currency,
      fx_rate_used: quote.fx_rate_used,
    },
    (items ?? []).map((i) => ({
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      line_total_gbp_pence: i.line_total_gbp_pence,
    })),
  );

  redirect(`/quote/${encodeURIComponent(quoteRef)}/accounts?token=${accountsToken}&done=1`);
}
