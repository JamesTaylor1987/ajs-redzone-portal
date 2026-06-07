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

  // Step 2: WhoAmI — confirms app can make any Dataverse call
  const whoRes = await fetch(`${INSTANCE_URL}/api/data/v9.2/WhoAmI`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
  });
  const whoBody = await whoRes.json();
  if (!whoRes.ok) {
    return NextResponse.json({ envCheck, tokenTest: "success", whoAmI: "failed", status: whoRes.status, error: whoBody });
  }

  // Step 3: find all custom (cr49c_) entities
  const entityRes = await fetch(
    `${INSTANCE_URL}/api/data/v9.2/EntityDefinitions?$select=LogicalName,EntitySetName,DisplayName&$filter=IsCustomEntity eq true`,
    { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" } },
  );
  const entityBody = await entityRes.json();
  const entities = (entityBody.value ?? [])
    .map((e: { LogicalName: string; EntitySetName: string }) => ({ logicalName: e.LogicalName, entitySetName: e.EntitySetName }))
    .filter((e: { logicalName: string }) => e.logicalName.startsWith("cr49c_"));

  // Step 4: fetch option set values for cr49c_docstatus and cr49c_projecttype
  const picklistRes = await fetch(
    `${INSTANCE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='cr49c_opportunities')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)&$filter=LogicalName eq 'cr49c_docstatus' or LogicalName eq 'cr49c_projecttype'`,
    { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" } },
  );
  const picklistBody = await picklistRes.json();
  const optionSets: Record<string, { value: number; label: string }[]> = {};
  for (const attr of (picklistBody.value ?? [])) {
    optionSets[attr.LogicalName] = (attr.OptionSet?.Options ?? []).map((o: { Value: number; Label: { UserLocalizedLabel: { Label: string } } }) => ({
      value: o.Value,
      label: o.Label?.UserLocalizedLabel?.Label ?? "",
    }));
  }

  // Step 5: try creating a test opportunity
  const oppUrl = `${INSTANCE_URL}/api/data/v9.2/cr49c_opportunitieses`;
  const oppRes = await fetch(oppUrl, {
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
      cr49c_projecttype: 774710007,
      cr49c_opportunitycontact: "Test Contact",
      new_estimatedprojectdurationmonths: 1,
    }),
  });

  if (!oppRes.ok) {
    const errText = await oppRes.text();
    return NextResponse.json({ envCheck, tokenTest: "success", whoAmI: whoBody, optionSets, opportunityTest: "failed", status: oppRes.status, urlUsed: oppUrl, error: errText });
  }

  const entityId = oppRes.headers.get("OData-EntityId") ?? oppRes.headers.get("odata-entityid") ?? "";
  const match = entityId.match(/\(([^)]+)\)/);
  const guid = match?.[1] ?? null;

  return NextResponse.json({ envCheck, tokenTest: "success", whoAmI: whoBody, optionSets, opportunityTest: "success", guid });
}
