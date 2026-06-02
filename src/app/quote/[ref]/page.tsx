import { getServiceClient } from "@/lib/supabase-server";
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

  const totalPence = (items ?? []).reduce(
    (s, i) => s + Number(i.line_total_gbp_pence ?? 0),
    0
  );
  const total = `£${(totalPence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
                      £
                      {(Number(i.line_total_gbp_pence) / 100).toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-bold pt-3 mt-2 border-t border-ajs-light">
                <span>Subtotal (ex-VAT)</span>
                <span>{total}</span>
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
