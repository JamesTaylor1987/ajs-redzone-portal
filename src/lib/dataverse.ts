const RZ_SUNDRY_ACCOUNT_GUID = "301398fa-01bf-f011-bbd3-7c1e52609c0d";

function cfg() {
  return {
    tenant:   process.env.DATAVERSE_TENANT_ID,
    clientId: process.env.DATAVERSE_CLIENT_ID,
    secret:   process.env.DATAVERSE_CLIENT_SECRET,
    url:      process.env.DATAVERSE_INSTANCE_URL?.replace(/\/$/, ""),
    noahGuid: process.env.DATAVERSE_NOAH_OWNER_GUID,
  };
}

function dvHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
  };
}

async function getAccessToken(): Promise<string> {
  const { tenant, clientId, secret, url } = cfg();
  const res = await fetch(
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
  if (!res.ok) throw new Error(`Dataverse auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function isConfigured(): boolean {
  const { tenant, clientId, secret, url } = cfg();
  return !!(tenant && clientId && secret && url);
}

function oq(s: string) {
  // Escape single quotes for OData $filter string literals
  return s.replace(/'/g, "''");
}

async function lookupOrCreateContact(
  token: string,
  url: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string | null,
): Promise<string | null> {
  try {
    const lookupRes = await fetch(
      `${url}/api/data/v9.2/contacts?$filter=emailaddress1 eq '${oq(email)}'&$select=contactid&$top=1`,
      { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" } },
    );
    if (lookupRes.ok) {
      const body = await lookupRes.json() as { value: { contactid: string }[] };
      if (body.value?.length) {
        const existingId = body.value[0].contactid;
        // Ensure existing contact is linked to the Redzone Sundry account
        await fetch(`${url}/api/data/v9.2/contacts(${existingId})`, {
          method: "PATCH",
          headers: dvHeaders(token),
          body: JSON.stringify({ "parentcustomerid_account@odata.bind": `/accounts(${RZ_SUNDRY_ACCOUNT_GUID})` }),
        }).catch(() => {/* non-blocking */});
        return existingId;
      }
    }

    const createBody: Record<string, unknown> = {
      firstname: firstName,
      lastname: lastName,
      emailaddress1: email,
      "parentcustomerid_account@odata.bind": `/accounts(${RZ_SUNDRY_ACCOUNT_GUID})`,
    };
    if (phone) createBody.telephone1 = phone;

    const createRes = await fetch(`${url}/api/data/v9.2/contacts`, {
      method: "POST",
      headers: dvHeaders(token),
      body: JSON.stringify(createBody),
    });
    if (!createRes.ok) {
      console.error("[dataverse] contact create failed:", createRes.status, await createRes.text());
      return null;
    }
    const entityId = createRes.headers.get("OData-EntityId") ?? createRes.headers.get("odata-entityid") ?? "";
    return entityId.match(/\(([^)]+)\)/)?.[1] ?? null;
  } catch (err) {
    console.error("[dataverse] lookupOrCreateContact error:", err);
    return null;
  }
}

async function lookupOrCreateSiteAddress(
  token: string,
  url: string,
  siteName: string | null,
  address1: string | null,
  address2: string | null,
  town: string | null,
  postcode: string | null,
  country: string | null,
): Promise<string | null> {
  // Postcode/country fallback per spec: if no postcode use country so mandatory field is always satisfied
  const postcodeValue = postcode?.trim() || country?.trim() || null;
  if (!postcodeValue) return null;

  try {
    const lookupRes = await fetch(
      `${url}/api/data/v9.2/cr49c_siteaddresses?$filter=cr49c_postcode eq '${oq(postcodeValue)}'&$select=cr49c_siteaddressid&$top=1`,
      { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" } },
    );
    if (lookupRes.ok) {
      const body = await lookupRes.json() as { value: { cr49c_siteaddressid: string }[] };
      if (body.value?.length) return body.value[0].cr49c_siteaddressid;
    }

    const createBody: Record<string, unknown> = {
      cr49c_sitename: siteName?.trim() || postcodeValue,
      cr49c_postcode: postcodeValue,
      "cr49c_Account@odata.bind": `/accounts(${RZ_SUNDRY_ACCOUNT_GUID})`,
    };
    if (address1?.trim()) createBody.cr49c_address1 = address1.trim();
    if (address2?.trim()) createBody.cr49c_address2 = address2.trim();
    if (town?.trim()) createBody.cr49c_town = town.trim();
    if (country?.trim()) createBody.cr49c_country = country.trim();

    const createRes = await fetch(`${url}/api/data/v9.2/cr49c_siteaddresses`, {
      method: "POST",
      headers: dvHeaders(token),
      body: JSON.stringify(createBody),
    });
    if (!createRes.ok) {
      console.error("[dataverse] site address create failed:", createRes.status, await createRes.text());
      return null;
    }
    const entityId = createRes.headers.get("OData-EntityId") ?? createRes.headers.get("odata-entityid") ?? "";
    return entityId.match(/\(([^)]+)\)/)?.[1] ?? null;
  } catch (err) {
    console.error("[dataverse] lookupOrCreateSiteAddress error:", err);
    return null;
  }
}

export interface QuoteForDataverse {
  ref: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
  revised:         "Revised",
};

export async function createDataverseOpportunity(
  quote: QuoteForDataverse,
): Promise<string | null> {
  if (!isConfigured()) {
    throw new Error("[dataverse] not configured — missing env vars");
  }

  const token = await getAccessToken();
  const { url, noahGuid } = cfg();

  // Lookup/create contact and site address in parallel before creating the opportunity
  const [contactGuid, siteAddressGuid] = await Promise.all([
    quote.contact_email
      ? lookupOrCreateContact(
          token, url!,
          quote.contact_first_name ?? quote.contact_name?.split(" ")[0] ?? "Unknown",
          quote.contact_last_name ?? (quote.contact_name?.split(" ").slice(1).join(" ") || "Unknown"),
          quote.contact_email,
          quote.contact_phone ?? null,
        )
      : Promise.resolve(null),
    lookupOrCreateSiteAddress(
      token, url!,
      quote.site_name ?? quote.contact_company,
      quote.site_address_line1,
      quote.site_address_line2,
      quote.site_address_city,
      quote.site_address_postcode,
      quote.site_country,
    ),
  ]);

  const totalGbp =
    (Number(quote.subtotal_gbp_pence) + Number(quote.shipping_gbp_pence ?? 0)) / 100;

  const siteAddress = [
    quote.site_name,
    quote.site_address_line1,
    quote.site_address_line2,
    quote.site_address_city,
    quote.site_address_postcode,
    quote.site_country,
  ].filter(Boolean).join(", ");

  const t = (s: string, max: number) => s.length > max ? s.substring(0, max) : s;

  const body: Record<string, unknown> = {
    cr49c_opportunityname: t(`${quote.contact_company ?? quote.contact_name ?? "Unknown"} — ${quote.ref}`, 100),
    cr49c_leaddescription: t(
      `Redzone Hardware - ${quote.site_name ?? quote.contact_company ?? "Unknown"}`,
      40,
    ),
    cr49c_opportunitysummary: [
      quote.contact_name ? `Contact: ${quote.contact_name}` : null,
      quote.contact_company ? `Company: ${quote.contact_company}` : null,
      siteAddress ? `Site: ${siteAddress}` : null,
    ].filter(Boolean).join("\n"),
    cr49c_quoteref: quote.ref,
    cr49c_dealvalue: totalGbp,
    cr49c_docstatus: "Quoted",
    cr49c_projecttype: 774710007,
    cr49c_closedate: (quote.submitted_at ?? new Date().toISOString()).split("T")[0],
    new_estimatedprojectdurationmonths: 1,
    "cr49c_Account@odata.bind": `/accounts(${RZ_SUNDRY_ACCOUNT_GUID})`,
  };

  if (quote.required_date) body.new_estimatedstartdate = quote.required_date;
  if (noahGuid) body["ownerid@odata.bind"] = `/systemusers(${noahGuid})`;

  const res = await fetch(`${url}/api/data/v9.2/cr49c_opportunitieses`, {
    method: "POST",
    headers: dvHeaders(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[dataverse] createOpportunity failed: ${res.status} ${errText.substring(0, 300)}`);
  }

  const entityIdHeader =
    res.headers.get("OData-EntityId") ?? res.headers.get("odata-entityid") ?? "";
  const oppGuid = entityIdHeader.match(/\(([^)]+)\)/)?.[1] ?? null;

  // PATCH contact and site address — use separate calls so nav property name errors
  // don't break the opportunity creation (guessing schema names from naming pattern)
  if (oppGuid) {
    const patchBody: Record<string, unknown> = {};
    if (contactGuid) patchBody["cr49c_OpportunityContact@odata.bind"] = `/contacts(${contactGuid})`;
    if (siteAddressGuid) patchBody["cr49c_SiteAddress@odata.bind"] = `/cr49c_siteaddresses(${siteAddressGuid})`;

    if (Object.keys(patchBody).length) {
      const patchRes = await fetch(`${url}/api/data/v9.2/cr49c_opportunitieses(${oppGuid})`, {
        method: "PATCH",
        headers: dvHeaders(token),
        body: JSON.stringify(patchBody),
      });
      if (!patchRes.ok) {
        console.error("[dataverse] contact/site PATCH failed:", patchRes.status, await patchRes.text());
      }
    }
  }

  return oppGuid;
}

export async function updateDataverseProbability(
  dataverseId: string,
  probability: number,
): Promise<void> {
  if (!isConfigured() || !dataverseId) return;

  try {
    const token = await getAccessToken();
    const { url } = cfg();
    const res = await fetch(
      `${url}/api/data/v9.2/cr49c_opportunitieses(${dataverseId})`,
      {
        method: "PATCH",
        headers: dvHeaders(token),
        body: JSON.stringify({ cr49c_probability: Math.round(probability) }),
      },
    );
    if (!res.ok) {
      console.error("[dataverse] updateProbability failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[dataverse] updateProbability error:", err);
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
    const { url } = cfg();
    const res = await fetch(
      `${url}/api/data/v9.2/cr49c_opportunitieses(${dataverseId})`,
      {
        method: "PATCH",
        headers: dvHeaders(token),
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
