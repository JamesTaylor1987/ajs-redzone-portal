import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
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

  // --- Step 1: env var check ---
  const tenant   = process.env.DATAVERSE_TENANT_ID;
  const clientId = process.env.DATAVERSE_CLIENT_ID;
  const secret   = process.env.DATAVERSE_CLIENT_SECRET;
  const url      = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");

  const envCheck = { tenant: !!tenant, clientId: !!clientId, secret: !!secret, url: !!url };

  if (!tenant || !clientId || !secret || !url) {
    return NextResponse.json({ step: "env_missing", envCheck });
  }

  // --- Step 2: token ---
  let token: string;
  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: secret,
          grant_type: "client_credentials",
          scope: `${url}/.default`,
        }),
      },
    );
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      return NextResponse.json({ step: "token_failed", status: tokenRes.status, body: body.substring(0, 300), envCheck });
    }
    const tokenBody = await tokenRes.json() as { access_token: string };
    token = tokenBody.access_token;
  } catch (err) {
    return NextResponse.json({ step: "token_threw", error: String(err), envCheck });
  }

  // --- Step 3: create opportunity directly (no wrapper function) ---
  const totalGbp = (product.price_gbp_pence + 15000) / 100;
  const oppBody = {
    cr49c_opportunityname: "Test Company Ltd — TEST-DIRECT",
    cr49c_leaddescription: "Direct Dataverse test — safe to delete",
    cr49c_opportunitysummary: "Contact: Test User\nCompany: Test Company Ltd\nSite: Test Site, 1 Test Street, Birmingham, B1 1BB, United Kingdom",
    cr49c_quoteref: "TEST-DIRECT",
    cr49c_dealvalue: totalGbp,
    cr49c_docstatus: "Quoted",
    cr49c_probability: 20,
    cr49c_projecttype: 774710007,
    cr49c_closedate: new Date().toISOString().split("T")[0],
    new_estimatedprojectdurationmonths: 1,
  };

  let dvGuid: string | null = null;
  let dvStatus: number | null = null;
  let dvError: string | null = null;

  try {
    const oppRes = await fetch(`${url}/api/data/v9.2/cr49c_opportunitieses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify(oppBody),
    });

    dvStatus = oppRes.status;

    if (!oppRes.ok) {
      dvError = (await oppRes.text()).substring(0, 500);
    } else {
      const entityIdHeader =
        oppRes.headers.get("OData-EntityId") ?? oppRes.headers.get("odata-entityid") ?? "";
      const match = entityIdHeader.match(/\(([^)]+)\)/);
      dvGuid = match?.[1] ?? null;
    }
  } catch (err) {
    dvError = String(err);
  }

  // --- Step 4: full quote flow ---
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

  return NextResponse.json({
    step: "complete",
    envCheck,
    directDvStatus: dvStatus,
    directDvGuid: dvGuid,
    directDvError: dvError,
    quote: quoteResult,
    savedDataverseId: savedGuid,
  });
}
