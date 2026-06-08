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
        client_id: clientId, client_secret: secret,
        grant_type: "client_credentials", scope: `${url}/.default`,
      }),
    },
  );
  const { access_token: token } = await tokenRes.json() as { access_token: string };

  const headers = { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" };

  const res = await fetch(
    `${url}/api/data/v9.2/EntityDefinitions(LogicalName='cr49c_opportunities')/ManyToOneRelationships?$select=SchemaName,ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName`,
    { headers },
  );
  const body = await res.json();

  const navProps = (body?.value ?? []).map((r: {
    SchemaName: string;
    ReferencingAttribute: string;
    ReferencedEntity: string;
    ReferencingEntityNavigationPropertyName: string;
  }) => ({
    attr: r.ReferencingAttribute,
    referencedEntity: r.ReferencedEntity,
    navProperty: r.ReferencingEntityNavigationPropertyName,
    schema: r.SchemaName,
  }));

  return NextResponse.json({ navProps });
}
