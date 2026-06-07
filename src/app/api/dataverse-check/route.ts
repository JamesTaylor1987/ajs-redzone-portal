import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const TENANT_ID = process.env.DATAVERSE_TENANT_ID;
  const CLIENT_ID = process.env.DATAVERSE_CLIENT_ID;
  const CLIENT_SECRET = process.env.DATAVERSE_CLIENT_SECRET;
  const INSTANCE_URL = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");

  const envCheck = {
    DATAVERSE_TENANT_ID:     !!TENANT_ID,
    DATAVERSE_CLIENT_ID:     !!CLIENT_ID,
    DATAVERSE_CLIENT_SECRET: !!CLIENT_SECRET,
    DATAVERSE_INSTANCE_URL:  !!INSTANCE_URL,
  };

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !INSTANCE_URL) {
    return NextResponse.json({ envCheck, tokenTest: "skipped — missing env vars" });
  }

  // Step 1: get token
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, // TENANT_ID should be ajsspalding.co.uk
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: `${INSTANCE_URL}/.default`,
      }),
    },
  );

  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.json({ envCheck, tokenTest: "failed", status: tokenRes.status, error: tokenBody });
  }

  const token = tokenBody.access_token as string;

  // Step 2: try creating a test opportunity
  const oppRes = await fetch(`${INSTANCE_URL}/api/data/v9.2/opportunities`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify({
      cr49c_leaddescription: "TEST — diagnostics check, safe to delete",
      cr49c_quoteref: "TEST-001",
      cr49c_dealvalue: 1.00,
      cr49c_docstatus: "Quoted",
      cr49c_probability: 20,
      cr49c_projecttype: "Red Zone Hardware",
      cr49c_account: "Red Zone Sundry",
      cr49c_opportunitycontact: "Test Contact",
      new_estimatedprojectdurationmonths: 1,
    }),
  });

  if (!oppRes.ok) {
    const errText = await oppRes.text();
    return NextResponse.json({ envCheck, tokenTest: "success", opportunityTest: "failed", status: oppRes.status, error: errText });
  }

  const entityId = oppRes.headers.get("OData-EntityId") ?? oppRes.headers.get("odata-entityid") ?? "";
  const match = entityId.match(/\(([^)]+)\)/);
  const guid = match?.[1] ?? null;

  return NextResponse.json({ envCheck, tokenTest: "success", opportunityTest: "success", guid });
}
