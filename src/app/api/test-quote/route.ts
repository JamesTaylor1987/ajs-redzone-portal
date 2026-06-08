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
  const testId = new Date().toTimeString().split(" ")[0].replace(/:/g, "");
  let directDvGuid: string | null = null;
  let directDvError: string | null = null;
  try {
    directDvGuid = await createDataverseOpportunity({
      ref: `TEST-A-${testId}`,
      contact_first_name: "Test",
      contact_last_name: "User",
      contact_name: "Test User",
      contact_email: "james@ajsspalding.co.uk",
      contact_phone: "07700900000",
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
      contactFirstName: "Test",
      contactLastName: "User",
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
      projectDescription: `TEST-B-${testId} — safe to delete`,
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

  // Directly test contact + site address creation to surface errors
  const RZ_ACCOUNT = "301398fa-01bf-f011-bbd3-7c1e52609c0d";
  let contactResult: string | null = null;
  let contactError: string | null = null;
  let siteResult: string | null = null;
  let siteError: string | null = null;

  try {
    const tenant   = process.env.DATAVERSE_TENANT_ID;
    const clientId = process.env.DATAVERSE_CLIENT_ID;
    const secret   = process.env.DATAVERSE_CLIENT_SECRET;
    const dvUrl    = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");
    const tokRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId!, client_secret: secret!, grant_type: "client_credentials", scope: `${dvUrl}/.default` }),
    });
    const { access_token: tok } = await tokRes.json() as { access_token: string };
    const h = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" };

    // Query contact ManyToOneRelationships to find correct account nav property
    const metaRes = await fetch(
      `${dvUrl}/api/data/v9.2/EntityDefinitions(LogicalName='contact')/ManyToOneRelationships?$select=ReferencedEntity,ReferencingAttribute,ReferencingEntityNavigationPropertyName`,
      { headers: { Authorization: `Bearer ${tok}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" } },
    );
    const metaBody = await metaRes.json() as { value: { ReferencedEntity: string; ReferencingAttribute: string; ReferencingEntityNavigationPropertyName: string }[] };
    const accountNavProps = (metaBody.value ?? [])
      .filter(r => r.ReferencedEntity === "account")
      .map(r => ({ attr: r.ReferencingAttribute, nav: r.ReferencingEntityNavigationPropertyName }));

    // Test contact create
    const cRes = await fetch(`${dvUrl}/api/data/v9.2/contacts`, {
      method: "POST", headers: h,
      body: JSON.stringify({
        firstname: "Test", lastname: "User", emailaddress1: `test-${Date.now()}@ajsspalding.co.uk`,
        telephone1: "07700900000",
      }),
    });
    contactResult = cRes.ok ? `ok — accountNavProps: ${JSON.stringify(accountNavProps)}` : await cRes.text();

    // Test site address create
    const sRes = await fetch(`${dvUrl}/api/data/v9.2/cr49c_siteaddresses`, {
      method: "POST", headers: h,
      body: JSON.stringify({
        cr49c_sitename: "Test Site",
        cr49c_postcode: "B1 1BB",
        cr49c_address1: "1 Test Street",
        cr49c_town: "Birmingham",
        cr49c_country: "United Kingdom",
        "cr49c_Account@odata.bind": `/accounts(${RZ_ACCOUNT})`,
      }),
    });
    siteResult = sRes.ok ? "ok" : await sRes.text();
  } catch (err) {
    contactError = String(err);
  }

  return NextResponse.json({ directDvGuid, directDvError, quote: quoteResult, savedDataverseId: savedGuid, contactCreate: contactResult, contactError, siteAddressCreate: siteResult, siteError });
}
