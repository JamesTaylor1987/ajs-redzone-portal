import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";
import { verificationHash } from "@/lib/magic-link";
import { VerifyForm } from "./VerifyForm";
import { SupportBanner } from "@/components/SupportBanner";
import { formatMoneyAtRate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n";

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

  const t = getT(getLocale(cookies().get("ajs_locale")?.value));

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, ref, status, contact_name, contact_email, contact_company, contact_phone, site_name, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country, required_date, project_description, install_requested, subtotal_gbp_pence, shipping_gbp_pence, shipping_pallets, magic_token, magic_expires_at, currency, fx_rate_used, created_at")
    .eq("ref", ref)
    .single();

  if (!quote || !token || quote.magic_token !== token) {
    return <InvalidLink t={t} />;
  }

  if (quote.magic_expires_at && new Date(quote.magic_expires_at) < new Date()) {
    return <ExpiredLink quoteRef={ref} t={t} />;
  }

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
              <div className="text-xs uppercase tracking-wide text-white/70">{t("returningToQuote")}</div>
              <div className="text-2xl font-extrabold mt-1">{ref}</div>
            </div>
            <div className="p-6">
              <p className="text-ajs-text text-sm mb-5 leading-relaxed">
                {t("verifyEmailPrompt")}
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

  const { data: items } = await supabase
    .from("quote_items")
    .select("id, sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence")
    .eq("quote_id", quote.id);

  const totalPence = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);

  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const fmt = (pence: number | string) => formatMoneyAtRate(Number(pence), ccy, fx);

  const statusLabel: Record<string, string> = {
    quote_submitted:  t("statusQuoteSubmitted"),
    order_confirmed:  t("statusOrderConfirmed"),
    in_build:         t("statusInBuild"),
    invoiced:         t("statusInvoiced"),
    payment_received: t("statusPaymentReceived"),
    ready_to_ship:    t("statusReadyToShip"),
    shipped:          t("statusShipped"),
    complete:         t("statusComplete"),
    cancelled:        t("statusCancelled"),
  };

  const firstName = quote.contact_name?.trim().split(" ")[0] ?? "there";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">

          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">{t("yourQuoteBadge")}</div>
            <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
            <div className="mt-2 inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {statusLabel[quote.status] ?? quote.status}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {quote.status === "quote_submitted" ? (
              <p className="text-ajs-text text-sm leading-relaxed">
                {t("editGreeting", { name: firstName })}
              </p>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-4 leading-relaxed">
                <strong>{t("orderConfirmedBanner")}</strong>
              </div>
            )}

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-2">{t("itemsLabel")}</h2>
              <ul className="divide-y divide-ajs-light text-sm">
                {(items ?? []).map((i) => (
                  <li key={i.id} className="py-2.5 flex justify-between gap-3">
                    <span>
                      <span className="font-mono text-xs font-bold text-ajs-dark">{i.sku}</span>{" "}
                      {i.name} &times; {i.qty}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {fmt(i.line_total_gbp_pence)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-sm pt-3 mt-1 border-t border-ajs-light text-ajs-muted">
                <span>{t("subtotalLabel")}</span>
                <span className="font-semibold text-ajs-dark">{fmt(totalPence)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 text-ajs-muted">
                <span>
                  {t("shippingLabel")}
                  {quote.shipping_pallets
                    ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})`
                    : ""}
                </span>
                <span className={`font-semibold ${quote.shipping_gbp_pence == null ? "text-amber-600" : "text-ajs-dark"}`}>
                  {quote.shipping_gbp_pence != null ? fmt(Number(quote.shipping_gbp_pence)) : "EXW"}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 mt-1 border-t border-ajs-light">
                <span>{t("totalExVAT")}</span>
                <span>{fmt(totalPence + (quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : 0))}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-ajs-light p-4 text-sm space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-2">{t("yourDetailsHeading")}</h2>
              <p><span className="text-ajs-muted">{t("nameLabel")}</span> {quote.contact_name}</p>
              {quote.contact_company && (
                <p><span className="text-ajs-muted">{t("companyLabel")}</span> {quote.contact_company}</p>
              )}
              {quote.site_name && (
                <p><span className="text-ajs-muted">{t("siteLabel")}</span> {quote.site_name}</p>
              )}
              <p><span className="text-ajs-muted">{t("emailLabel")}</span> {quote.contact_email}</p>
              {quote.required_date && (
                <p>
                  <span className="text-ajs-muted">{t("requiredByLabel")}</span>{" "}
                  {new Date(quote.required_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <p className="text-xs text-ajs-muted leading-relaxed">
              <strong className="text-ajs-text">{t("vatAllPricesExVat")}</strong> {t("vatShortNoticeEdit")}
            </p>

            <div className="border-t border-ajs-light pt-5 space-y-3">
              {quote.status === "quote_submitted" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/quote/${encodeURIComponent(ref)}/amend?token=${token}`}
                    className="flex-1 text-center px-5 py-3 rounded-lg border-2 border-ajs-light text-ajs-dark font-bold hover:bg-ajs-light transition-colors"
                  >
                    {t("amendQuote")}
                  </Link>
                  <Link
                    href={`/quote/${encodeURIComponent(ref)}/accept?token=${token}`}
                    className="flex-1 text-center px-5 py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
                  >
                    {t("acceptOrder")}
                  </Link>
                </div>
              )}

              {quote.status !== "quote_submitted" && (
                <p className="text-sm text-ajs-muted">
                  {t("orderPlacedNote", { email: "rz@ajsspalding.co.uk" })
                    .split("rz@ajsspalding.co.uk")
                    .reduce<React.ReactNode[]>((acc, part, i) => {
                      if (i > 0) acc.push(
                        <a key="email" href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
                          rz@ajsspalding.co.uk
                        </a>
                      );
                      acc.push(part);
                      return acc;
                    }, [])}
                </p>
              )}
            </div>

            <Link
              href="/"
              className="inline-block text-sm text-ajs-muted underline"
            >
              {t("backToCatalogueLink")}
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <SupportBanner />
        </div>
      </div>
    </main>
  );
}

function InvalidLink({ t }: { t: ReturnType<typeof getT> }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-ajs-dark">{t("invalidLinkTitle")}</h1>
        <p className="text-ajs-muted text-sm">{t("invalidLinkDesc")}</p>
        <p className="text-ajs-muted text-sm">
          {t("needHelp")}{" "}
          <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
            rz@ajsspalding.co.uk
          </a>{" "}
          &middot; 01406 424954
        </p>
      </div>
    </main>
  );
}

function ExpiredLink({ quoteRef, t }: { quoteRef: string; t: ReturnType<typeof getT> }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-ajs-dark">{t("linkExpiredTitle")}</h1>
        <p className="text-ajs-muted text-sm">
          {t("linkExpiredDesc", { ref: quoteRef })}
        </p>
        <p className="text-ajs-muted text-sm">
          {t("contactForNewLink")}{" "}
          <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
            rz@ajsspalding.co.uk
          </a>{" "}
          &middot; 01406&nbsp;424954
        </p>
      </div>
    </main>
  );
}
