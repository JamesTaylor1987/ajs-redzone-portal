import { getServiceClient } from "@/lib/supabase-server";
import { AccountsForm } from "./AccountsForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { ref: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AccountsPage({ params, searchParams }: PageProps) {
  const ref = decodeURIComponent(params.ref);
  const token = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : (searchParams.token ?? "");
  const done = searchParams.done === "1";

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, ref, status, contact_name, contact_company, contact_email, contact_phone, subtotal_gbp_pence, shipping_gbp_pence, shipping_pallets, accounts_token",
    )
    .eq("ref", ref)
    .single();

  if (!quote || !token || quote.accounts_token !== token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-ajs-dark">Invalid link</h1>
          <p className="text-ajs-muted text-sm">
            This account details link is invalid. Please ask the person who placed the order to
            resend it, or contact{" "}
            <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
              rz@ajsspalding.co.uk
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  if (done || quote.status !== "quote_submitted") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">
            <div className="brand-gradient text-white p-6">
              <div className="text-xs uppercase tracking-wide text-white/70">Account details received</div>
              <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-ajs-text text-sm leading-relaxed">
                Thank you — the account information for order <strong>{quote.ref}</strong> has
                been submitted. The AJS Redzone team will be in touch to confirm the invoice.
              </p>
              <p className="text-xs text-ajs-muted leading-relaxed">
                Questions?{" "}
                <a href="mailto:rz@ajsspalding.co.uk" className="text-ajs-primary underline">
                  rz@ajsspalding.co.uk
                </a>{" "}
                &middot; 01406&nbsp;424954
              </p>
            </div>
          </div>
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
  const gbp = (p: number) =>
    "£" +
    (p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden mb-6">
          <div className="brand-gradient text-white p-6">
            <div className="text-xs uppercase tracking-wide text-white/70">Account details required</div>
            <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
          </div>
          <div className="p-5">
            <p className="text-sm text-ajs-text leading-relaxed mb-4">
              {quote.contact_name}
              {quote.contact_company ? ` at ${quote.contact_company}` : ""} has placed an order
              with AJS Redzone and asked you to complete the account and billing information so an
              invoice can be raised.
            </p>

            {/* Order summary */}
            <ul className="divide-y divide-ajs-light text-sm mb-3">
              {(items ?? []).map((i) => (
                <li key={i.id} className="py-2 flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-xs font-bold text-ajs-dark">{i.sku}</span>{" "}
                    {i.name} &times; {i.qty}
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    {gbp(Number(i.line_total_gbp_pence))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm pt-2 border-t border-ajs-light text-ajs-muted">
              <span>Subtotal</span>
              <span className="font-semibold text-ajs-dark">{gbp(subtotalPence)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 text-ajs-muted">
              <span>Shipping{quote.shipping_pallets ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})` : ""}</span>
              <span className={`font-semibold ${shippingPence === null ? "text-amber-600" : "text-ajs-dark"}`}>
                {shippingPence !== null ? gbp(shippingPence) : "EXW"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 mt-1 border-t border-ajs-light">
              <span>Total (ex-VAT)</span>
              <span>{gbp(grandTotalPence)}</span>
            </div>
          </div>
        </div>

        {/* Account details form */}
        <AccountsForm
          quoteRef={ref}
          accountsToken={token}
          prefill={{
            contactName: quote.contact_name ?? "",
            contactPhone: quote.contact_phone ?? "",
            contactEmail: quote.contact_email ?? "",
          }}
        />
      </div>
    </main>
  );
}
