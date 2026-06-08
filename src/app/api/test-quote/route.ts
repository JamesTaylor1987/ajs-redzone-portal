import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const tenant   = process.env.DATAVERSE_TENANT_ID;
  const clientId = process.env.DATAVERSE_CLIENT_ID;
  const secret   = process.env.DATAVERSE_CLIENT_SECRET;
  const url      = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");

  // Step 1: get token
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: secret!,
        grant_type: "client_credentials",
        scope: `${url}/.default`,
      }),
    },
  );
  if (!tokenRes.ok) {
    return NextResponse.json({ step: "token", status: tokenRes.status, error: await tokenRes.json() });
  }
  const { access_token: token } = await tokenRes.json() as { access_token: string };

  // Step 2: create opportunity
  const body = {
    cr49c_opportunityname: "Test Company Ltd — TEST-DIRECT",
    cr49c_leaddescription: "Direct Dataverse test — safe to delete",
    cr49c_opportunitysummary: "Contact: Test User\nCompany: Test Company Ltd\nSite: 1 Test Street, Birmingham, B1 1BB",
    cr49c_quoteref: "TEST-DIRECT",
    cr49c_dealvalue: 2075,
    cr49c_docstatus: "Quoted",
    cr49c_probability: 20,
    cr49c_projecttype: 774710007,
    cr49c_closedate: new Date().toISOString().split("T")[0],
    new_estimatedprojectdurationmonths: 1,
  };

  const oppRes = await fetch(`${url}/api/data/v9.2/cr49c_opportunitieses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify(body),
  });

  if (!oppRes.ok) {
    return NextResponse.json({ step: "create", status: oppRes.status, error: await oppRes.text() });
  }

  const entityId = oppRes.headers.get("OData-EntityId") ?? oppRes.headers.get("odata-entityid") ?? "";
  const match = entityId.match(/\(([^)]+)\)/);
  const guid = match?.[1] ?? null;

  return NextResponse.json({ step: "success", guid, totalGbp: 2075 });
}
