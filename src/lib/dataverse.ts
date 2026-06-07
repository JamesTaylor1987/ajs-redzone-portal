const TENANT = process.env.DATAVERSE_TENANT_ID;
const CLIENT_ID = process.env.DATAVERSE_CLIENT_ID;
const CLIENT_SECRET = process.env.DATAVERSE_CLIENT_SECRET;
const INSTANCE_URL = process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, "");
const NOAH_OWNER_GUID = process.env.DATAVERSE_NOAH_OWNER_GUID;

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        grant_type: "client_credentials",
        scope: `${INSTANCE_URL}/.default`,
      }),
    },
  );

  if (!res.ok) throw new Error(`Dataverse auth failed: ${res.status}`);

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function isConfigured(): boolean {
  return !!(TENANT && CLIENT_ID && CLIENT_SECRET && INSTANCE_URL);
}

export interface QuoteForDataverse {
  ref: string;
  contact_name: string | null;
  contact_company: string | null;
  project_description: string | null;
  site_name: string | null;
  site_address_line1: string | null;
  site_address_line2: string | null;
  site_address_city: string | null;
  site_address_postcode: string | null;
  site_country: string | null;
  required_date: string | null;
  subtotal_gbp_pence: number;
  shipping_gbp_pence: number | null;
  submitted_at: string | null;
}

const STATUS_MAP: Record<string, string> = {
  order_confirmed: "Order Confirmed",
  in_build:        "In Build",
  ready_to_ship:   "Ready to Ship",
  shipped:         "Shipped",
  complete:        "Complete",
  cancelled:       "Cancelled",
  expired:         "Expired",
};

export async function createDataverseOpportunity(
  quote: QuoteForDataverse,
): Promise<string | null> {
  if (!isConfigured()) return null;

  try {
    const token = await getAccessToken();

    const totalGbp =
      (Number(quote.subtotal_gbp_pence) + Number(quote.shipping_gbp_pence ?? 0)) / 100;

    const siteAddress = [
      quote.site_name,
      quote.site_address_line1,
      quote.site_address_line2,
      quote.site_address_city,
      quote.site_address_postcode,
      quote.site_country,
    ]
      .filter(Boolean)
      .join(", ");

    const body: Record<string, unknown> = {
      cr49c_leaddescription:
        quote.project_description ??
        `${quote.contact_company ?? quote.contact_name ?? "Unknown"} — Red Zone Hardware`,
      cr49c_quoteref: quote.ref,
      cr49c_dealvalue: totalGbp,
      cr49c_docstatus: "Quoted",
      cr49c_probability: 20,
      cr49c_projecttype: 774710007,
      cr49c_opportunitycontact: quote.contact_name ?? "",
      cr49c_siteaddress: siteAddress,
      cr49c_closedate: (quote.submitted_at ?? new Date().toISOString()).split("T")[0],
      new_estimatedprojectdurationmonths: 1,
    };

    if (quote.required_date) body.new_estimatedstartdate = quote.required_date;
    if (NOAH_OWNER_GUID) body["ownerid@odata.bind"] = `/systemusers(${NOAH_OWNER_GUID})`;

    const res = await fetch(`${INSTANCE_URL}/api/data/v9.2/cr49c_opportunitieses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[dataverse] createOpportunity failed:", res.status, await res.text());
      return null;
    }

    const entityIdHeader =
      res.headers.get("OData-EntityId") ?? res.headers.get("odata-entityid") ?? "";
    const match = entityIdHeader.match(/\(([^)]+)\)/);
    return match?.[1] ?? null;
  } catch (err) {
    console.error("[dataverse] createOpportunity error:", err);
    return null;
  }
}

export async function updateDataverseOpportunity(
  dataverseId: string,
  portalStatus: string,
): Promise<void> {
  if (!isConfigured() || !dataverseId) return;

  const docStatus = STATUS_MAP[portalStatus];
  if (!docStatus) return;

  try {
    const token = await getAccessToken();

    const res = await fetch(
      `${INSTANCE_URL}/api/data/v9.2/cr49c_opportunitieses(${dataverseId})`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
        body: JSON.stringify({ cr49c_docstatus: docStatus }),
      },
    );

    if (!res.ok) {
      console.error("[dataverse] updateOpportunity failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[dataverse] updateOpportunity error:", err);
  }
}
