import { cookies } from "next/headers";
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";
import { verificationHash } from "@/lib/magic-link";
import { VerifyForm } from "./VerifyForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { ref: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

const ERR: Record<string, string> = {
  email: "That email address does not match our records. Please try again.",
  expired:
    "This magic link has expired after 90 days. Contact rz@ajsspalding.co.uk or call 01406 424954 to request a new one.",
  invalid: "This link is invalid. Please check the email from AJS Redzone.",
};

export default async function QuoteEditPage({ params, searchParams }: PageProps) {
  const ref = decodeURIComponent(params.ref);
  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : (searchParams.token ?? "");
  const errKey = Array.isArray(searchParams.err) ? searchParams.err[0] : searchParams.err;
  const justAccepted = searchParams.accepted === "1";

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, ref, status, contact_name, contact_email, contact_company, contact_phone, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country, required_date, project_description, install_requested, subtotal_gbp_pence, magic_token, magic_expires_at, currency, created_at")
    .eq("ref", ref)
    .single();

  // Never reveal whether the ref exists — treat any mismatch as invalid link.
  if (!quote || !token || quote.magic_token !== token) {
    return <InvalidLink />;
  }

  if (quote.magic_expires_at && new Date(quote.magic_expires_at) < new Date()) {
    return <ExpiredLink quoteRef={ref} />;
  }

  // Check email verification cookie.
  const cookieName = `rz_v_${quote.id.slice(0, 8)}`;
  const cookieVal = cookies().get(cookieName)?.value ?? "";
  const expectedHash = verificationHash(token, quote.contact_email);
  const isVerified = cookieVal === expectedHash;

  const errorMessage = errKey ? (ERR[errKey] ?? "An error occurred. Please try again.") : null;

  if (!isVerified) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">
            <div className="brand-gradient text-white p-6">
              <div className="text-xs uppercase tracking-wide text-white/70">Returning to your quote</div>
              <div className="text-2xl font-extrabold mt-1">{ref}</div>
            </div>
            <div className="p-6">
              <p className="text-ajs-text text-sm mb-5 leading-relaxed">
                To view your quote, please confirm the email address you used when submitting it.
              </p>
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3 mb-4">
                  {errorMessage}
                </div>
              )}
              <VerifyForm quoteRef={ref} token={token} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Verified — fetch items and display quote.
  const { data: items } = await supabase
    .from("quote_items")
    .select("id, sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence")
    .eq("quote_id", quote.id);

  const totalPence = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);

  function gbp(pence: number | string) {
    return (
      "£" +
      (Number(pence) / 100).toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  const statusLabel: Record<string, string> = {
    quote_submitted: "Quote submitted — under review",
    order_confirmed: "Order confirmed",
    in_build: "In build / production",
    ready_to_ship: "Ready to ship",
    shipped: "Shipped",
    complete: "Complete",
    cancelled: "Cancelled",
  };

  const firstName = quote.contact_name?.trim().split(" ")[0] ?? "there";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">

          {/* Header */}
          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">Your quote</div>
            <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
            <div className="mt-2 inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {statusLabel[quote.status] ?? quote.status}
            </div>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-ajs-text text-sm leading-relaxed">
              Hi {firstName} — here is your current quote. The AJS Redzone team will be in touch
              to confirm final pricing and lead times. Use the buttons below to amend or accept.
            </p>

            {/* Items */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-2">Items</h2>
              <ul className="divide-y divide-ajs-light text-sm">
                {(items ?? []).map((i) => (
                  <li key={i.id} className="py-2.5 flex justify-between gap-3">
                    <span>
                      <span className="font-mono text-xs text-ajs-muted">{i.sku}</span>{" "}
                      {i.name} &times; {i.qty}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {gbp(i.line_total_gbp_pence)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-bold text-base pt-3 mt-1 border-t border-ajs-light">
                <span>Subtotal (ex-VAT)</span>
                <span>{gbp(totalPence)}</span>
              </div>
            </div>

            {/* Contact details */}
            <div className="bg-slate-50 rounded-xl border border-ajs-light p-4 text-sm space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-2">Your details</h2>
              <p><span className="text-ajs-muted">Name:</span> {quote.contact_name}</p>
              {quote.contact_company && (
                <p><span className="text-ajs-muted">Company:</span> {quote.contact_company}</p>
              )}
              <p><span className="text-ajs-muted">Email:</span> {quote.contact_email}</p>
              {quote.required_date && (
                <p>
                  <span className="text-ajs-muted">Required by:</span>{" "}
                  {new Date(quote.required_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {/* VAT notice */}
            <p className="text-xs text-ajs-muted leading-relaxed">
              <strong className="text-ajs-text">All prices ex-VAT.</strong> VAT applied on invoice
              based on registration status. Hardware invoiced 100% prior to shipment. DAP delivery
              terms.
            </p>

            {/* Action buttons */}
            <div className="border-t border-ajs-light pt-5 space-y-3">
              {justAccepted && (
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-4 leading-relaxed">
                  <strong>Order confirmed.</strong> Your order has been placed. An invoice will be
                  issued within 24&nbsp;hours, payable prior to shipment. You&apos;ll receive email
                  updates as your order progresses.
                </div>
              )}

              {quote.status === "quote_submitted" && (
                <>
                  <p className="text-xs text-ajs-muted">
                    To amend your quote contact{" "}
                    <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
                      rz@ajsspalding.co.uk
                    </a>{" "}
                    or call 01406&nbsp;424954.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={`mailto:rz@ajsspalding.co.uk?subject=Amendment request: ${quote.ref}`}
                      className="flex-1 text-center px-5 py-3 rounded-lg border-2 border-ajs-light text-ajs-muted font-bold hover:bg-ajs-light transition-colors"
                    >
                      Request amendment
                    </a>
                    <Link
                      href={`/quote/${encodeURIComponent(ref)}/accept?token=${token}`}
                      className="flex-1 text-center px-5 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
                    >
                      Accept &amp; Place Order
                    </Link>
                  </div>
                </>
              )}

              {quote.status !== "quote_submitted" && !justAccepted && (
                <p className="text-sm text-ajs-muted">
                  This order has been placed. Contact{" "}
                  <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
                    rz@ajsspalding.co.uk
                  </a>{" "}
                  if you have any questions.
                </p>
              )}
            </div>

            <Link
              href="/"
              className="inline-block text-sm text-ajs-muted underline"
            >
              ← Back to the catalogue
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function InvalidLink() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-ajs-dark">Invalid link</h1>
        <p className="text-ajs-muted text-sm">
          This quote link is invalid. Please check the email you received from AJS Redzone.
        </p>
        <p className="text-ajs-muted text-sm">
          Need help?{" "}
          <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
            rz@ajsspalding.co.uk
          </a>{" "}
          &middot; 01406 424954
        </p>
      </div>
    </main>
  );
}

function ExpiredLink({ quoteRef }: { quoteRef: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-ajs-dark">Link expired</h1>
        <p className="text-ajs-muted text-sm">
          Your magic link for <code className="font-mono">{quoteRef}</code> has expired after
          90&nbsp;days.
        </p>
        <p className="text-ajs-muted text-sm">
          Contact us for a new link:{" "}
          <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
            rz@ajsspalding.co.uk
          </a>{" "}
          &middot; 01406&nbsp;424954
        </p>
      </div>
    </main>
  );
}
