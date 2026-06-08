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

  // 1. cr49c_docstatus option set values
  const statusRes = await fetch(
    `${url}/api/data/v9.2/EntityDefinitions(LogicalName='cr49c_opportunities')/Attributes(LogicalName='cr49c_docstatus')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`,
    { headers },
  );
  const statusBody = await statusRes.json();
  const docStatusOptions = (statusBody?.OptionSet?.Options ?? []).map(
    (o: { Value: number; Label: { UserLocalizedLabel: { Label: string } } }) => ({
      value: o.Value,
      label: o.Label?.UserLocalizedLabel?.Label,
    }),
  );

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
    redZoneSundryAccount: accountBody?.value ?? [],
    redzoneAccount: account2Body?.value ?? [],
  });
}
