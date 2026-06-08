import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const tenant   = process.env.DATAVERSE_TENANT_ID;
  const clientId = process.env.DATAVERSE_CLIENT_ID;
  const secret   = process.env.DATAVERSE_CLIENT_SECRET;
  const url      = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");

  if (!tenant || !clientId || !secret || !url) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

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
  const tokenBody = await tokenRes.json() as { access_token: string };
  const token = tokenBody.access_token;

  const headers = {
    Authorization: `Bearer ${token}`,
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
  };

  // 1. cr49c_docstatus — try multiple approaches
  const [r1, r2, r3] = await Promise.all([
    // Cast to PicklistAttributeMetadata with expand
    fetch(`${url}/api/data/v9.2/EntityDefinitions(LogicalName='cr49c_opportunities')/Attributes(LogicalName='cr49c_docstatus')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`, { headers }),
    // Base attribute without cast
    fetch(`${url}/api/data/v9.2/EntityDefinitions(LogicalName='cr49c_opportunities')/Attributes(LogicalName='cr49c_docstatus')`, { headers }),
    // Global option sets — look for one matching cr49c_docstatus
    fetch(`${url}/api/data/v9.2/GlobalOptionSetDefinitions?$select=Name,Options`, { headers }),
  ]);

  const [b1, b2, b3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

  // Extract options from PicklistAttributeMetadata
  const docStatusOptions = (b1?.OptionSet?.Options ?? []).map(
    (o: { Value: number; Label: { UserLocalizedLabel: { Label: string } } }) => ({
      value: o.Value, label: o.Label?.UserLocalizedLabel?.Label,
    }),
  );

  // Find matching global option set
  const matchingGlobalSet = (b3?.value ?? [])
    .filter((s: { Name: string }) => s.Name?.includes("docstatus") || s.Name?.includes("cr49c"))
    .map((s: { Name: string; Options: unknown[] }) => ({ name: s.Name, options: s.Options }));

  const ACCOUNT_GUID = "301398fa-01bf-f011-bbd3-7c1e52609c0d";

  // 2. Try PATCH with @odata.bind on most recent test record
  // Use the last known working opportunity GUID
  const testOppGuid = "138b6021-0863-f111-a826-7c1e52715e42";

  const patchBind = await fetch(`${url}/api/data/v9.2/cr49c_opportunitieses(${testOppGuid})`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ "cr49c_account@odata.bind": `/accounts(${ACCOUNT_GUID})` }),
  });
  const patchBindResult = patchBind.ok ? "ok" : await patchBind.text();

  // 3. Try $ref association approach
  const refRes = await fetch(
    `${url}/api/data/v9.2/cr49c_opportunitieses(${testOppGuid})/cr49c_account/$ref`,
    {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ "@odata.id": `${url}/api/data/v9.2/accounts(${ACCOUNT_GUID})` }),
    },
  );
  const refResult = refRes.ok ? "ok" : await refRes.text();

  return NextResponse.json({
    docStatusOptions,
    rawAttributeType: b2?.AttributeType,
    rawB1Keys: Object.keys(b1 ?? {}),
    matchingGlobalSets: matchingGlobalSet,
    accountGuid: ACCOUNT_GUID,
    patchBindResult,
    refResult,
  });
}
