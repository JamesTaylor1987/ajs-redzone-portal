import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import type { CreateQuoteRequest, CreateQuoteResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: CreateQuoteRequest;
  try {
    body = (await request.json()) as CreateQuoteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.lines?.length) {
    return NextResponse.json({ error: "Basket is empty" }, { status: 400 });
  }
  if (!body.details?.contactName?.trim() || !body.details?.contactEmail?.trim()) {
    return NextResponse.json(
      { error: "contactName and contactEmail are required" },
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
  const { data: quoteRow, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      ref,
      status: "quote_submitted",
      currency: body.currency ?? "GBP",
      fx_rate_used: body.fxRateUsed,
      contact_name: body.details.contactName.trim(),
      contact_company: body.details.contactCompany?.trim() || null,
      contact_email: body.details.contactEmail.trim(),
      contact_phone: body.details.contactPhone?.trim() || null,
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
      submitted_at: new Date().toISOString(),
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

  const response: CreateQuoteResponse = { ref, id: quoteRow.id };
  return NextResponse.json(response, { status: 201 });
}
