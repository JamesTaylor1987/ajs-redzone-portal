import { getServiceClient } from "@/lib/supabase-server";
import type { CartLine, CheckoutDetails } from "@/lib/types";
import { RestoreBasket } from "./RestoreBasket";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { ref: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AmendQuotePage({ params, searchParams }: PageProps) {
  const ref = decodeURIComponent(params.ref);
  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : (searchParams.token ?? "");

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, ref, status, magic_token, magic_expires_at, contact_name, contact_company, contact_email, contact_phone, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country, required_date, project_description")
    .eq("ref", ref)
    .single();

  if (!quote || !token || quote.magic_token !== token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-ajs-dark">Invalid link</h1>
          <p className="text-ajs-muted text-sm">
            Please return via the link in your original quote email.
          </p>
        </div>
      </main>
    );
  }

  if (quote.magic_expires_at && new Date(quote.magic_expires_at) < new Date()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-ajs-dark">Link expired</h1>
          <p className="text-ajs-muted text-sm">
            Contact{" "}
            <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
              rz@ajsspalding.co.uk
            </a>{" "}
            or call 01406&nbsp;424954 to request a new link.
          </p>
        </div>
      </main>
    );
  }

  if (quote.status !== "quote_submitted") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-ajs-dark">Order already placed</h1>
          <p className="text-ajs-muted text-sm">
            This quote has been accepted and can no longer be amended. Contact{" "}
            <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
              rz@ajsspalding.co.uk
            </a>{" "}
            if you need to make changes.
          </p>
        </div>
      </main>
    );
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("product_id, sku, name, qty, unit_price_gbp_pence")
    .eq("quote_id", quote.id);

  const cartLines: CartLine[] = (items ?? []).map((i) => ({
    productId: i.product_id,
    sku: i.sku,
    name: i.name,
    qty: i.qty,
    unitPricePence: Number(i.unit_price_gbp_pence),
  }));

  const nameParts = (quote.contact_name ?? "").split(" ");
  const prefill: Partial<CheckoutDetails> = {
    contactFirstName: nameParts[0] ?? "",
    contactLastName: nameParts.slice(1).join(" ") ?? "",
    contactCompany: quote.contact_company ?? "",
    contactEmail: quote.contact_email ?? "",
    contactPhone: quote.contact_phone ?? "",
    siteAddressLine1: quote.site_address_line1 ?? "",
    siteAddressLine2: quote.site_address_line2 ?? "",
    siteAddressCity: quote.site_address_city ?? "",
    siteAddressPostcode: quote.site_address_postcode ?? "",
    siteCountry: quote.site_country ?? "United Kingdom",
    requiredDate: quote.required_date ?? "",
    projectDescription: quote.project_description ?? "",
  };

  return <RestoreBasket lines={cartLines} prefill={prefill} originalRef={ref} />;
}
