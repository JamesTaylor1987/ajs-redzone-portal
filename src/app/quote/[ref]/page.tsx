import { getServiceClient } from "@/lib/supabase-server";
import { formatMoneyAtRate } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { ref: string };
}

export default async function QuoteConfirmationPage({ params }: PageProps) {
  const ref = decodeURIComponent(params.ref);
  const supabase = getServiceClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("ref", ref)
    .single();

  if (error || !quote) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-ajs-dark">Quote not found</h1>
          <p className="text-ajs-muted text-sm">
            We couldn&apos;t find a quote with reference <code>{ref}</code>.
          </p>
          <Link href="/" className="inline-block bg-ajs-primary text-white px-4 py-2 rounded-lg font-semibold">
            Back to the catalogue
          </Link>
        </div>
      </main>
    );
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quote.id);

  const subtotalPence = (items ?? []).reduce(
    (s, i) => s + Number(i.line_total_gbp_pence ?? 0),
    0
  );
  const shippingPence = quote.shipping_gbp_pence ? Number(quote.shipping_gbp_pence) : null;
  const grandTotalPence = subtotalPence + (shippingPence ?? 0);
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const fmt = (p: number) => formatMoneyAtRate(p, ccy, fx);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-md border border-ajs-light overflow-hidden">
          <div className="brand-gradient text-white p-6">
            <div className="text-sm uppercase tracking-wide text-white/80">
              Quote submitted
            </div>
            <div className="text-3xl font-extrabold mt-1">{quote.ref}</div>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-ajs-text">
              Thanks {quote.contact_name?.split(" ")[0] ?? "there"} — we&apos;ve received your
              request. A confirmation email with your magic link has been sent to{" "}
              <strong>{quote.contact_email}</strong>. Use that link to amend or accept your quote
              once it&apos;s been priced.
            </p>

            <div className="text-sm space-y-0.5">
              {quote.contact_company && <p><span className="text-ajs-muted">Company:</span> <span className="font-semibold">{quote.contact_company}</span></p>}
              {quote.site_name && <p><span className="text-ajs-muted">Site:</span> <span className="font-semibold">{quote.site_name}</span></p>}
            </div>

            <div>
              <h2 className="text-sm font-bold text-ajs-dark uppercase tracking-wide mb-2">
                Items
              </h2>
              <ul className="divide-y divide-ajs-light text-sm">
                {(items ?? []).map((i) => (
                  <li key={i.id} className="py-2 flex justify-between gap-2">
                    <span>
                      <span className="font-mono text-xs font-bold text-ajs-dark">{i.sku}</span>{" "}
                      {i.name} × {i.qty}
                    </span>
                    <span className="font-semibold">
                      {fmt(Number(i.line_total_gbp_pence))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-sm pt-3 mt-2 border-t border-ajs-light text-ajs-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-ajs-dark">{fmt(subtotalPence)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 text-ajs-muted">
                <span>Shipping{quote.shipping_pallets ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})` : ""}</span>
                <span className={`font-semibold ${shippingPence === null ? "text-amber-600" : "text-ajs-dark"}`}>
                  {shippingPence !== null ? fmt(shippingPence) : "EXW"}
                </span>
              </div>
              <div className="flex justify-between font-bold pt-2 mt-1 border-t border-ajs-light">
                <span>Total (ex-VAT)</span>
                <span>{fmt(grandTotalPence)}</span>
              </div>
            </div>

            <div className="text-xs text-ajs-muted leading-relaxed space-y-1.5">
              <p>
                <strong className="text-ajs-text">All prices ex-VAT.</strong> VAT is applied on
                the invoice based on your country and VAT registration status — UK customers
                pay 20%, EU VAT-registered businesses are zero-rated under reverse charge (VAT
                number required), non-EU customers are zero-rated as export.
              </p>
              <p>
                Hardware invoiced 100% prior to shipment. DAP delivery terms.
              </p>
            </div>

            <Link
              href="/"
              className="inline-block bg-ajs-primary text-white font-bold rounded-lg px-5 py-3 hover:bg-ajs-dark"
            >
              Back to the catalogue
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
