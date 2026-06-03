import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { updateStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = [
  { value: "quote_submitted", label: "Quote submitted" },
  { value: "order_confirmed", label: "Order confirmed" },
  { value: "in_build", label: "In build" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "shipped", label: "Shipped" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

interface PageProps {
  params: { id: string };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const supabase = getServiceClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!quote) notFound();

  const { data: items } = await supabase
    .from("quote_items")
    .select("id, sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence")
    .eq("quote_id", quote.id);

  const subtotalPence = (items ?? []).reduce(
    (s, i) => s + Number(i.line_total_gbp_pence),
    0,
  );
  const shippingPence = quote.shipping_gbp_pence ? Number(quote.shipping_gbp_pence) : null;
  const grandTotalPence = subtotalPence + (shippingPence ?? 0);

  const ai = quote.account_info as Record<string, unknown> | null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/orders"
          className="text-ajs-muted text-sm hover:underline"
        >
          ← Orders
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{quote.ref}</span>
      </div>

      {/* Status updater */}
      <div className="bg-white rounded-xl border border-ajs-light p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">
          Status
        </h2>
        <form action={updateStatusAction} className="space-y-3">
          <input type="hidden" name="id" value={quote.id} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-ajs-muted mb-1">Status</label>
              <select
                name="status"
                defaultValue={quote.status}
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ajs-muted mb-1">Tracking ref <span className="text-ajs-light">(shipped only)</span></label>
              <input
                type="text"
                name="tracking_ref"
                defaultValue={quote.tracking_ref ?? ""}
                placeholder="e.g. DPD 1Z9999999"
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs text-ajs-muted mb-1">Tracking link <span className="text-ajs-light">(optional URL)</span></label>
              <input
                type="url"
                name="tracking_url"
                defaultValue={quote.tracking_url ?? ""}
                placeholder="https://track.dpd.co.uk/…"
                className="w-full border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors"
          >
            Save &amp; notify customer
          </button>
        </form>
      </div>

      {/* Contact */}
      <Card title="Customer">
        <Row label="Name" value={quote.contact_name} />
        <Row label="Company" value={quote.contact_company} />
        <Row label="Email" value={quote.contact_email} />
        <Row label="Phone" value={quote.contact_phone} />
      </Card>

      {/* Site / Delivery */}
      <Card title="Delivery address">
        <Row
          label="Address"
          value={[
            quote.site_address_line1,
            quote.site_address_line2,
            quote.site_address_city,
            quote.site_address_postcode,
            quote.site_country,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        <Row
          label="Required by"
          value={
            quote.required_date
              ? new Date(quote.required_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : null
          }
        />
        <Row
          label="Install requested"
          value={quote.install_requested ? "Yes" : "No"}
        />
        <Row label="Project description" value={quote.project_description} />
      </Card>

      {/* Items */}
      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">
            Items
          </h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
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
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-ajs-dark">
                  {i.sku}
                </td>
                <td className="px-4 py-2.5">{i.name}</td>
                <td className="px-4 py-2.5 font-semibold">{i.qty}</td>
                <td className="px-4 py-2.5">{gbp(i.unit_price_gbp_pence)}</td>
                <td className="px-4 py-2.5 font-semibold">
                  {gbp(i.line_total_gbp_pence)}
                </td>
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

      {/* Account info (if accepted) */}
      {ai && (
        <Card title="Account information">
          <Row label="Registered name" value={String(ai.registeredCompanyName ?? "")} />
          <Row label="Reg. address" value={String(ai.registeredCompanyAddress ?? "")} />
          {!!ai.invoiceAddressDifferent && (
            <Row label="Invoice address" value={str(ai.invoiceAddress)} />
          )}
          <Row label="Reg. number" value={str(ai.companyRegistrationNumber)} />
          <Row label="Country of reg." value={str(ai.countryOfRegistration)} />
          <Row label="Account contact" value={str(ai.accountContactName)} />
          <Row label="Account tel." value={str(ai.accountContactTelephone)} />
          <Row label="Account email" value={str(ai.accountContactEmail)} />
          <Row label="Invoice email" value={str(ai.invoiceEmail)} />
          <Row label="Statement email" value={str(ai.statementEmail)} />
          <Row
            label="PO required"
            value={ai.requiresPONumber ? "Yes" : "No"}
          />
          <Row label="VAT registered" value={ai.vatRegistered ? "Yes" : "No"} />
          {!!ai.vatNumber && <Row label="VAT number" value={str(ai.vatNumber)} />}
          {!!ai.localTaxNumber && (
            <Row label="Local tax no." value={str(ai.localTaxNumber)} />
          )}
          {!!ai.signatory && (
            <Row
              label="GDPR signatory"
              value={`${(ai.signatory as Record<string, string>).name} (${(ai.signatory as Record<string, string>).position})`}
            />
          )}
        </Card>
      )}

      {/* Dates */}
      <Card title="Timestamps">
        <Row
          label="Submitted"
          value={
            quote.submitted_at
              ? new Date(quote.submitted_at).toLocaleString("en-GB")
              : null
          }
        />
        <Row
          label="Accepted"
          value={
            quote.accepted_at
              ? new Date(quote.accepted_at).toLocaleString("en-GB")
              : null
          }
        />
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">
        {title}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {children}
      </dl>
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
    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function str(v: unknown): string {
  return v != null ? String(v) : "";
}

function gbp(pence: number | string | null) {
  if (pence == null) return "—";
  return (
    "£" +
    (Number(pence) / 100).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
