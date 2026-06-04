import { cookies } from "next/headers";
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase-server";
import { verificationHash, buildAccountsUrl } from "@/lib/magic-link";
import { AccountInfoForm } from "./AccountInfoForm";
import { ForwardToAccounts } from "./ForwardToAccounts";
import { SupportBanner } from "@/components/SupportBanner";

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

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, ref, status, contact_name, contact_email, contact_phone, contact_company, subtotal_gbp_pence, shipping_gbp_pence, shipping_pallets, magic_token, magic_expires_at, accounts_token",
    )
    .eq("ref", ref)
    .single();

  if (!quote || !token || quote.magic_token !== token) {
    return <Invalid />;
  }

  if (quote.magic_expires_at && new Date(quote.magic_expires_at) < new Date()) {
    return <Invalid expired />;
  }

  // Must have verified email on the edit page first.
  const cookieVal = cookies().get(`rz_v_${quote.id.slice(0, 8)}`)?.value ?? "";
  if (cookieVal !== verificationHash(token, quote.contact_email)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-ajs-dark">Session expired</h1>
          <p className="text-ajs-muted text-sm">Please return via your magic link to verify your email again.</p>
          <Link
            href={`/quote/${encodeURIComponent(ref)}/edit?token=${token}`}
            className="inline-block bg-ajs-primary text-white font-bold rounded-lg px-5 py-2.5 text-sm"
          >
            Back to your quote
          </Link>
        </div>
      </main>
    );
  }

  // Already accepted — send back to the confirmed view.
  if (quote.status !== "quote_submitted") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-ajs-dark">Order already placed</h1>
          <p className="text-ajs-muted text-sm">This quote has already been accepted.</p>
          <Link
            href={`/quote/${encodeURIComponent(ref)}/edit?token=${token}`}
            className="inline-block bg-ajs-primary text-white font-bold rounded-lg px-5 py-2.5 text-sm"
          >
            View your order
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
  const fmt = (p: number) => "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden mb-6">
          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">Accept &amp; place order</div>
            <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
          </div>
          <div className="p-5">
            <p className="text-sm text-ajs-text leading-relaxed mb-4">
              You are about to place a binding order for the items below. Please complete the
              account information form so we can invoice you correctly.
            </p>
            {/* Mini quote summary */}
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
              <span>Subtotal</span>
              <span className="font-semibold text-ajs-dark">{fmt(subtotalPence)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 text-ajs-muted">
              <span>Shipping{quote.shipping_pallets ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})` : ""}</span>
              <span className={`font-semibold ${shippingPence === null ? "text-amber-600" : "text-ajs-dark"}`}>
                {shippingPence !== null ? fmt(shippingPence) : "EXW"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 mt-1 border-t border-ajs-light">
              <span>Total (ex-VAT)</span>
              <span>{fmt(grandTotalPence)}</span>
            </div>
          </div>
        </div>

        {/* Account info form */}
        <AccountInfoForm
          quoteRef={ref}
          token={token}
          prefill={{
            contactName: quote.contact_name ?? "",
            contactPhone: quote.contact_phone ?? "",
            contactEmail: quote.contact_email,
          }}
        />

        {/* Forward to accounts */}
        {quote.accounts_token && (
          <div className="bg-white rounded-xl border border-ajs-light p-5">
            <ForwardToAccounts
              quoteRef={ref}
              token={token}
              accountsUrl={buildAccountsUrl(ref, quote.accounts_token)}
            />
          </div>
        )}

        <div className="mt-4 space-y-4">
          <SupportBanner />
          <Link
            href={`/quote/${encodeURIComponent(ref)}/edit?token=${token}`}
            className="text-sm text-ajs-muted underline"
          >
            ← Back to quote
          </Link>
        </div>
      </div>
    </main>
  );
}

function Invalid({ expired }: { expired?: boolean }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-bold text-ajs-dark">{expired ? "Link expired" : "Invalid link"}</h1>
        <p className="text-ajs-muted text-sm">
          {expired
            ? "Your magic link has expired after 90 days."
            : "This link is invalid. Please check the email from AJS Redzone."}
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
