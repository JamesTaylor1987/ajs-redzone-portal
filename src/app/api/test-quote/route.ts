import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { createDataverseOpportunity } from "@/lib/dataverse";
import type { CreateQuoteRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST() {
  const supabase = getServiceClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, sku, name, price_gbp_pence")
    .eq("active", true)
    .limit(1)
    .single();

  if (!product) {
    return NextResponse.json({ error: "No active products found" }, { status: 400 });
  }

  // Direct DV call to surface any errors immediately
  let directDvGuid: string | null = null;
  let directDvError: string | null = null;
  try {
    directDvGuid = await createDataverseOpportunity({
      ref: "TEST-DIRECT",
      contact_name: "Test User",
      contact_company: "Test Company Ltd",
      project_description: "Direct test — safe to delete",
      site_name: "Test Site",
      site_address_line1: "1 Test Street",
      site_address_line2: null,
      site_address_city: "Birmingham",
      site_address_postcode: "B1 1BB",
      site_country: "United Kingdom",
      required_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      subtotal_gbp_pence: product.price_gbp_pence,
      shipping_gbp_pence: 15000,
      submitted_at: new Date().toISOString(),
    });
  } catch (err) {
    directDvError = String(err);
  }

  const body: CreateQuoteRequest = {
    currency: "GBP",
    fxRateUsed: null,
    shippingPallets: 1,
    shippingGbpPence: 15000,
    lines: [{ productId: product.id, sku: product.sku, name: product.name, qty: 1, unitPricePence: product.price_gbp_pence }],
    details: {
      contactName: "Test User",
      contactCompany: "Test Company Ltd",
      contactEmail: "james@ajsspalding.co.uk",
      contactPhone: "07700900000",
      siteName: "Test Site",
      siteAddressLine1: "1 Test Street",
      siteAddressLine2: "",
      siteAddressCity: "Birmingham",
      siteAddressPostcode: "B1 1BB",
      siteCountry: "United Kingdom",
      requiredDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      projectDescription: "Dataverse integration test — safe to delete",
      installRequested: false,
    },
  };

  const quoteRes = await fetch(`https://redzone.ajsspalding.co.uk/api/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const quoteResult = await quoteRes.json();

  let savedGuid: string | null = null;
  if (quoteResult.id) {
    const { data } = await supabase
      .from("quotes")
      .select("dataverse_opportunity_id")
      .eq("id", quoteResult.id)
      .single();
    savedGuid = data?.dataverse_opportunity_id ?? null;
  }

  return NextResponse.json({ directDvGuid, directDvError, quote: quoteResult, savedDataverseId: savedGuid });
}
