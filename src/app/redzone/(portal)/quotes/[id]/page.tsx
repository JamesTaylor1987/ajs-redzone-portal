import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  quote_submitted:  "Quote submitted",
  order_confirmed:  "Order confirmed",
  in_build:         "In build",
  ready_to_ship:    "Ready to ship",
  shipped:          "Shipped",
  complete:         "Complete",
  cancelled:        "Cancelled",
  revised:          "Superseded",
};

const STATUS_COLOUR: Record<string, string> = {
  quote_submitted:  "bg-yellow-100 text-yellow-700",
  order_confirmed:  "bg-blue-100 text-blue-700",
  in_build:         "bg-purple-100 text-purple-700",
  ready_to_ship:    "bg-teal-100 text-teal-700",
  shipped:          "bg-green-100 text-green-700",
  complete:         "bg-slate-100 text-slate-500",
  cancelled:        "bg-rose-100 text-rose-600",
  revised:          "bg-slate-100 text-slate-400",
};

interface PageProps {
  params: { id: string };
}

export default async function RedzoneQuoteDetailPage({ params }: PageProps) {
  const supabase = getAuthClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/redzone/login");

  const serviceClient = getServiceClient();

  const { data: pm } = await serviceClient
    .from("rz_pms")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single();

  if (!pm) redirect("/redzone/login");

  const { data: quote } = await serviceClient
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("rz_pm_id", pm.id)
    .single();

  if (!quote) notFound();

  const { data: items } = await serviceClient
    .from("quote_items")
    .select("id, sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence")
    .eq("quote_id", quote.id);

  const subtotalPence = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const shippingPence = quote.shipping_gbp_pence ? Number(quote.shipping_gbp_pence) : null;
  const grandTotalPence = subtotalPence + (shippingPence ?? 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/redzone/quotes" className="text-ajs-muted text-sm hover:underline">
          ← My Quotes
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{quote.ref}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[quote.status] ?? "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABEL[quote.status] ?? quote.status}
        </span>
      </div>

      {/* Tracking info (if shipped) */}
      {quote.tracking_ref && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-1">Tracking</p>
          <p className="font-semibold text-ajs-dark">{quote.tracking_ref}</p>
          {quote.tracking_url && (
            <a href={quote.tracking_url} target="_blank" rel="noopener noreferrer" className="text-sm text-ajs-primary hover:underline">
              Track shipment →
            </a>
          )}
        </div>
      )}

      {/* Customer */}
      <Card title="Customer">
        <Row label="Name" value={quote.contact_name} />
        <Row label="Company" value={quote.contact_company} />
        <Row label="Email" value={quote.contact_email} />
        <Row label="Phone" value={quote.contact_phone} />
      </Card>

      {/* Delivery */}
      <Card title="Delivery address">
        <Row
          label="Address"
          value={[
            quote.site_address_line1,
            quote.site_address_line2,
            quote.site_address_city,
            quote.site_address_postcode,
            quote.site_country,
          ].filter(Boolean).join(", ")}
        />
        <Row
          label="Required by"
          value={
            quote.required_date
              ? new Date(quote.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
              : null
          }
        />
        <Row label="Install requested" value={quote.install_requested ? "Yes" : "No"} />
        <Row label="Project description" value={quote.project_description} />
      </Card>

      {/* Items */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Items</h2>
        </div>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden divide-y divide-ajs-light">
          {(items ?? []).map((i) => (
            <div key={i.id} className="px-4 py-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-ajs-dark">{i.sku}</span>
                  <p className="text-sm mt-0.5">{i.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{gbp(i.line_total_gbp_pence)}</p>
                  <p className="text-xs text-ajs-muted">×{i.qty} @ {gbp(i.unit_price_gbp_pence)}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 bg-slate-50 space-y-1.5 text-sm">
            <div className="flex justify-between text-ajs-muted">
              <span>Subtotal (ex-VAT)</span>
              <span className="font-semibold text-ajs-dark">{gbp(subtotalPence)}</span>
            </div>
            <div className="flex justify-between text-ajs-muted">
              <span>Shipping{quote.shipping_pallets ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})` : ""}</span>
              <span className={`font-semibold ${shippingPence === null ? "text-amber-600" : "text-ajs-dark"}`}>
                {shippingPence !== null ? gbp(shippingPence) : "EXW"}
              </span>
            </div>
            <div className="flex justify-between font-bold border-t border-ajs-light pt-1.5">
              <span>Total (ex-VAT)</span>
              <span className="text-ajs-primary">{gbp(grandTotalPence)}</span>
            </div>
          </div>
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-ajs-light text-ajs-dark">
              <tr>
                <Th>SKU</Th>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Unit</Th>
                <Th>Line total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ajs-light">
              {(items ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-ajs-dark">{i.sku}</td>
                  <td className="px-4 py-2.5">{i.name}</td>
                  <td className="px-4 py-2.5 font-semibold">{i.qty}</td>
                  <td className="px-4 py-2.5">{gbp(i.unit_price_gbp_pence)}</td>
                  <td className="px-4 py-2.5 font-semibold">{gbp(i.line_total_gbp_pence)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ajs-light bg-slate-50 text-sm">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-ajs-muted">Subtotal (ex-VAT)</td>
                <td className="px-4 py-2 font-semibold">{gbp(subtotalPence)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-ajs-muted">
                  Shipping{quote.shipping_pallets ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})` : ""}
                </td>
                <td className="px-4 py-2 font-semibold">
                  {shippingPence !== null ? gbp(shippingPence) : <span className="text-amber-600">EXW</span>}
                </td>
              </tr>
              <tr className="border-t border-ajs-light">
                <td colSpan={4} className="px-4 py-2.5 font-bold text-right">Total (ex-VAT)</td>
                <td className="px-4 py-2.5 font-extrabold text-ajs-primary">{gbp(grandTotalPence)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Timestamps */}
      <Card title="Timeline">
        <Row
          label="Submitted"
          value={quote.submitted_at ? new Date(quote.submitted_at).toLocaleString("en-GB") : null}
        />
        <Row
          label="Accepted"
          value={quote.accepted_at ? new Date(quote.accepted_at).toLocaleString("en-GB") : null}
        />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">{title}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-ajs-muted">{label}</dt>
      <dd className="font-medium text-ajs-text">{value}</dd>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{children}</th>
  );
}

function gbp(pence: number | string | null) {
  if (pence == null) return "—";
  return "£" + (Number(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
