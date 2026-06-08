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

  // 2. Red Zone Sundry account GUID
  const accountRes = await fetch(
    `${url}/api/data/v9.2/accounts?$filter=name eq 'Red Zone Sundry'&$select=accountid,name`,
    { headers },
  );
  const accountBody = await accountRes.json();

  // 3. Also try with "Redzone Sundry" (no space)
  const account2Res = await fetch(
    `${url}/api/data/v9.2/accounts?$filter=name eq 'Redzone Sundry'&$select=accountid,name`,
    { headers },
  );
  const account2Body = await account2Res.json();

  return NextResponse.json({
    docStatusOptions,
    rawAttributeType: b2?.AttributeType,
    rawOptionSetMetadataId: b1?.OptionSet?.MetadataId ?? null,
    rawB1Keys: Object.keys(b1 ?? {}),
    matchingGlobalSets: matchingGlobalSet,
    redZoneSundryAccount: accountBody?.value ?? [],
    redzoneAccount: account2Body?.value ?? [],
  });
}
