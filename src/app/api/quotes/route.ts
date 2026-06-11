import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { generateMagicToken, magicLinkExpiry, buildMagicUrl } from "@/lib/magic-link";
import { sendQuoteEmails } from "@/lib/email";
import { createDataverseOpportunity, updateDataverseOpportunity } from "@/lib/dataverse";
import { getLocale } from "@/lib/i18n";
import type { CreateQuoteRequest, CreateQuoteResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const localeCookie = cookieHeader.match(/ajs_locale=([^;]+)/)?.[1] ?? null;
  const locale = getLocale(localeCookie);

  let body: CreateQuoteRequest;
  try {
    body = (await request.json()) as CreateQuoteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.lines?.length) {
    return NextResponse.json({ error: "Basket is empty" }, { status: 400 });
  }
  if (!body.details?.contactFirstName?.trim() || !body.details?.contactLastName?.trim() || !body.details?.contactEmail?.trim()) {
    return NextResponse.json(
      { error: "contactFirstName, contactLastName and contactEmail are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // 1. Allocate a Q[YY]-RZ[####] reference via the Postgres function.
  const { data: refData, error: refError } = await supabase.rpc("allocate_quote_ref");
  if (refError || !refData) {
    return NextResponse.json(
      { error: `Could not allocate quote ref: ${refError?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
  const ref = String(refData);

  // 2. Re-price server-side from products table (don't trust client prices).
  const skus = body.lines.map((l) => l.sku);
  const { data: productRows, error: prodError } = await supabase
    .from("products")
    .select("id, sku, name, price_gbp_pence, active")
    .in("sku", skus);
  if (prodError) {
    return NextResponse.json(
      { error: `Pricing lookup failed: ${prodError.message}` },
      { status: 500 }
    );
  }
  const priceMap = new Map(
    (productRows ?? [])
      .filter((p) => p.active)
      .map((p) => [p.sku, p])
  );

  let subtotalPence = 0;
  const itemsToInsert: Array<{
    sku: string;
    name: string;
    product_id: string;
    qty: number;
    unit_price_gbp_pence: number;
    line_total_gbp_pence: number;
  }> = [];
  for (const line of body.lines) {
    const product = priceMap.get(line.sku);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown or inactive product: ${line.sku}` },
        { status: 400 }
      );
    }
    const qty = Math.max(1, Math.floor(line.qty));
    const lineTotal = qty * product.price_gbp_pence;
    subtotalPence += lineTotal;
    itemsToInsert.push({
      sku: product.sku,
      name: product.name,
      product_id: product.id,
      qty,
      unit_price_gbp_pence: product.price_gbp_pence,
      line_total_gbp_pence: lineTotal,
    });
  }

  // 3. Insert the quote row.
  const magicToken = generateMagicToken();
  const magicExpiresAt = magicLinkExpiry();
  const accountsToken = generateMagicToken();

  const { data: quoteRow, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      ref,
      accounts_token: accountsToken,
      original_quote_ref: body.originalQuoteRef ?? null,
      status: "quote_submitted",
      currency: body.currency ?? "GBP",
      fx_rate_used: body.fxRateUsed,
      contact_name: `${body.details.contactFirstName.trim()} ${body.details.contactLastName.trim()}`,
      contact_company: body.details.contactCompany?.trim() || null,
      contact_email: body.details.contactEmail.trim(),
      contact_phone: body.details.contactPhone?.trim() || null,
      site_name: body.details.siteName?.trim() || null,
      site_address_line1: body.details.siteAddressLine1?.trim() || null,
      site_address_line2: body.details.siteAddressLine2?.trim() || null,
      site_address_city: body.details.siteAddressCity?.trim() || null,
      site_address_postcode: body.details.siteAddressPostcode?.trim() || null,
      site_country: body.details.siteCountry?.trim() || null,
      required_date: body.details.requiredDate || null,
      project_description: body.details.projectDescription?.trim() || null,
      install_requested: !!body.details.installRequested,
      install_details: body.details.installDetails ?? null,
      subtotal_gbp_pence: subtotalPence,
      shipping_gbp_pence: body.shippingGbpPence ?? null,
      shipping_pallets: body.shippingPallets ?? 1,
      submitted_at: new Date().toISOString(),
      magic_token: magicToken,
      magic_expires_at: magicExpiresAt.toISOString(),
      locale,
    })
    .select("id")
    .single();

  if (quoteError || !quoteRow) {
    return NextResponse.json(
      { error: `Could not create quote: ${quoteError?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  // 4. Insert the items.
  const itemsRows = itemsToInsert.map((i) => ({ ...i, quote_id: quoteRow.id }));
  const { error: itemsError } = await supabase.from("quote_items").insert(itemsRows);
  if (itemsError) {
    return NextResponse.json(
      { error: `Could not save items: ${itemsError.message}` },
      { status: 500 }
    );
  }

  // 5. Mark the original quote as revised and update Dataverse (non-blocking).
  if (body.originalQuoteRef) {
    const { data: origQuote } = await supabase
      .from("quotes")
      .select("dataverse_opportunity_id")
      .eq("ref", body.originalQuoteRef)
      .single();

    await supabase
      .from("quotes")
      .update({ status: "revised" })
      .eq("ref", body.originalQuoteRef)
      .eq("status", "quote_submitted"); // only if still open — don't overwrite accepted orders

    if (origQuote?.dataverse_opportunity_id) {
      updateDataverseOpportunity(origQuote.dataverse_opportunity_id, "revised").catch(
        (err) => console.error("[quotes] updateDataverseOpportunity (revised) failed:", err),
      );
    }
  }

  // 6. If installation requested, create an installation_quote row (non-blocking).
  if (body.details.installRequested) {
    const { data: iqRefData } = await supabase.rpc("allocate_installation_quote_ref");
    if (iqRefData) {
      await supabase.from("installation_quotes").insert({
        quote_ref: String(iqRefData),
        hardware_quote_id: quoteRow.id,
        hardware_quote_ref: ref,
        customer_email: body.details.contactEmail.trim(),
        customer_name: `${body.details.contactFirstName.trim()} ${body.details.contactLastName.trim()}`,
        company_name: body.details.contactCompany?.trim() || null,
        site_name: body.details.siteName?.trim() || null,
        site_address_line1: body.details.siteAddressLine1?.trim() || null,
        site_address_line2: body.details.siteAddressLine2?.trim() || null,
        site_address_city: body.details.siteAddressCity?.trim() || null,
        site_address_postcode: body.details.siteAddressPostcode?.trim() || null,
        site_country: body.details.siteCountry?.trim() || null,
        required_date: body.details.requiredDate || null,
        project_description: body.details.projectDescription?.trim() || null,
      });
    }
  }

  // 7. Send emails + create Dataverse opportunity in parallel (non-blocking failures).
  const magicUrl = buildMagicUrl(ref, magicToken);
  const submittedAt = new Date().toISOString();
  const contactName = `${body.details.contactFirstName.trim()} ${body.details.contactLastName.trim()}`;

  // Fire email non-blocking
  sendQuoteEmails(
    {
      ref,
      contact_name: contactName,
      contact_email: body.details.contactEmail.trim(),
      contact_company: body.details.contactCompany?.trim() || null,
      subtotal_gbp_pence: subtotalPence,
      shipping_gbp_pence: body.shippingGbpPence ?? null,
      shipping_pallets: body.shippingPallets ?? 1,
      currency: body.currency ?? "GBP",
      fx_rate_used: body.fxRateUsed,
      locale,
    },
    itemsToInsert.map((i) => ({
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      line_total_gbp_pence: i.line_total_gbp_pence,
    })),
    magicUrl,
  ).catch((err) => console.error("[quotes] email error:", err));

  let dvGuid: string | null = null;
  try {
    dvGuid = await createDataverseOpportunity({
      ref,
      contact_first_name: body.details.contactFirstName.trim(),
      contact_last_name: body.details.contactLastName.trim(),
      contact_name: contactName,
      contact_email: body.details.contactEmail.trim(),
      contact_phone: body.details.contactPhone?.trim() || null,
      contact_company: body.details.contactCompany?.trim() || null,
      project_description: body.details.projectDescription?.trim() || null,
      site_name: body.details.siteName?.trim() || null,
      site_address_line1: body.details.siteAddressLine1?.trim() || null,
      site_address_line2: body.details.siteAddressLine2?.trim() || null,
      site_address_city: body.details.siteAddressCity?.trim() || null,
      site_address_postcode: body.details.siteAddressPostcode?.trim() || null,
      site_country: body.details.siteCountry?.trim() || null,
      required_date: body.details.requiredDate || null,
      subtotal_gbp_pence: subtotalPence,
      shipping_gbp_pence: body.shippingGbpPence ?? null,
      submitted_at: submittedAt,
    });
  } catch (err) {
    console.error("[quotes] createDataverseOpportunity failed:", err);
  }

  if (dvGuid) {
    await supabase.from("quotes").update({ dataverse_opportunity_id: dvGuid }).eq("id", quoteRow.id);
  }

  const response: CreateQuoteResponse = { ref, id: quoteRow.id };
  return NextResponse.json(response, { status: 201 });
}
