import { cookies } from "next/headers";
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";
import { verificationHash, buildAccountsUrl } from "@/lib/magic-link";
import { AccountInfoForm } from "./AccountInfoForm";
import { ForwardToAccounts } from "./ForwardToAccounts";
import { SupportBanner } from "@/components/SupportBanner";
import { formatMoneyAtRate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { ref: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AcceptQuotePage({ params, searchParams }: PageProps) {
  const ref = decodeURIComponent(params.ref);
  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : (searchParams.token ?? "");

  const t = getT(getLocale(cookies().get("ajs_locale")?.value));

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, ref, status, contact_name, contact_email, contact_phone, contact_company, subtotal_gbp_pence, shipping_gbp_pence, shipping_pallets, magic_token, magic_expires_at, accounts_token, currency, fx_rate_used",
    )
    .eq("ref", ref)
    .single();

  if (!quote || !token || quote.magic_token !== token) {
    return <Invalid t={t} />;
  }

  if (quote.magic_expires_at && new Date(quote.magic_expires_at) < new Date()) {
    return <Invalid expired t={t} />;
  }

  const cookieVal = cookies().get(`rz_v_${quote.id.slice(0, 8)}`)?.value ?? "";
  if (cookieVal !== verificationHash(token, quote.contact_email)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-ajs-dark">{t("sessionExpiredTitle")}</h1>
          <p className="text-ajs-muted text-sm">{t("sessionExpiredDesc")}</p>
          <Link
            href={`/quote/${encodeURIComponent(ref)}/edit?token=${token}`}
            className="inline-block bg-ajs-primary text-white font-bold rounded-lg px-5 py-2.5 text-sm"
          >
            {t("backToQuoteBtn")}
          </Link>
        </div>
      </main>
    );
  }

  if (quote.status !== "quote_submitted") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-ajs-dark">{t("orderAlreadyPlacedTitle")}</h1>
          <p className="text-ajs-muted text-sm">{t("orderAlreadyPlacedDesc")}</p>
          <Link
            href={`/quote/${encodeURIComponent(ref)}/edit?token=${token}`}
            className="inline-block bg-ajs-primary text-white font-bold rounded-lg px-5 py-2.5 text-sm"
          >
            {t("viewOrderBtn")}
          </Link>
        </div>
      </main>
    );
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("id, sku, name, qty, line_total_gbp_pence")
    .eq("quote_id", quote.id);

  const subtotalPence = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const shippingPence = quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null;
  const grandTotalPence = subtotalPence + (shippingPence ?? 0);
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const fmt = (p: number) => formatMoneyAtRate(p, ccy, fx);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden mb-6">
          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">{t("acceptAndPlaceTitle")}</div>
            <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
          </div>
          <div className="p-5">
            <p className="text-sm text-ajs-text leading-relaxed mb-4">
              {t("bindingOrderNote")}
            </p>
            <ul className="divide-y divide-ajs-light text-sm mb-3">
              {(items ?? []).map((i) => (
                <li key={i.id} className="py-2 flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-xs font-bold text-ajs-dark">{i.sku}</span>{" "}
                    {i.name} &times; {i.qty}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{fmt(Number(i.line_total_gbp_pence))}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm pt-2 border-t border-ajs-light text-ajs-muted">
              <span>{t("subtotalLabel")}</span>
              <span className="font-semibold text-ajs-dark">{fmt(subtotalPence)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 text-ajs-muted">
              <span>
                {t("shippingLabel")}
                {quote.shipping_pallets
                  ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})`
                  : ""}
              </span>
              <span className={`font-semibold ${shippingPence === null ? "text-amber-600" : "text-ajs-dark"}`}>
                {shippingPence !== null ? fmt(shippingPence) : "EXW"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 mt-1 border-t border-ajs-light">
              <span>{t("totalExVAT")}</span>
              <span>{fmt(grandTotalPence)}</span>
            </div>
          </div>
        </div>

        {quote.accounts_token && (
          <div className="bg-white rounded-xl border border-ajs-light p-5 mb-6">
            <ForwardToAccounts
              quoteRef={ref}
              token={token}
              accountsUrl={buildAccountsUrl(ref, quote.accounts_token)}
            />
          </div>
        )}

        <AccountInfoForm
          quoteRef={ref}
          token={token}
          prefill={{
            contactName: quote.contact_name ?? "",
            contactPhone: quote.contact_phone ?? "",
            contactEmail: quote.contact_email,
          }}
        />

        <div className="mt-4 space-y-4">
          <SupportBanner />
          <Link
            href={`/quote/${encodeURIComponent(ref)}/edit?token=${token}`}
            className="text-sm text-ajs-muted underline"
          >
            {t("backToQuoteLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function Invalid({ expired, t }: { expired?: boolean; t: ReturnType<typeof getT> }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-ajs-dark">
          {expired ? t("linkExpiredTitle") : t("invalidLinkTitle")}
        </h1>
        <p className="text-ajs-muted text-sm">
          {expired ? t("linkExpiredDescGeneric") : t("invalidLinkDesc")}
        </p>
        <p className="text-ajs-muted text-sm">
          <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
            rz@ajsspalding.co.uk
          </a>{" "}
          &middot; 01406&nbsp;424954
        </p>
      </div>
    </main>
  );
}
