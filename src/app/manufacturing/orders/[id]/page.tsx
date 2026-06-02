import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { StatusUpdateForm } from "./StatusUpdateForm";

export const dynamic = "force-dynamic";

const STATUS_COLOUR: Record<string, string> = {
  order_confirmed: "bg-blue-100 text-blue-700",
  in_build:        "bg-purple-100 text-purple-700",
  ready_to_ship:   "bg-teal-100 text-teal-700",
  shipped:         "bg-green-100 text-green-700",
  complete:        "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  order_confirmed: "Order confirmed",
  in_build:        "In build",
  ready_to_ship:   "Ready to ship",
  shipped:         "Shipped",
  complete:        "Complete",
};

interface PageProps {
  params: { id: string };
}

export default async function ManufacturingOrderDetailPage({ params }: PageProps) {
  const supabase = getServiceClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, ref, status, contact_name, contact_company, contact_phone, required_date, install_requested, site_address_line1, site_address_line2, site_address_city, site_address_postcode, site_country")
    .eq("id", params.id)
    .single();

  if (!quote) notFound();

  const { data: items } = await supabase
    .from("quote_items")
    .select("id, sku, name, qty")
    .eq("quote_id", quote.id);

  const addr = [
    quote.site_address_line1, quote.site_address_line2,
    quote.site_address_city, quote.site_address_postcode, quote.site_country,
  ].filter(Boolean).join(", ");

  const requiredDate = quote.required_date
    ? new Date(quote.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = quote.required_date
    ? Math.ceil((new Date(quote.required_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/manufacturing/orders" className="text-ajs-muted text-sm hover:underline">
          ← Work orders
        </Link>
        <span className="text-ajs-light">/</span>
        <span className="font-mono font-bold text-ajs-dark">{quote.ref}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOUR[quote.status] ?? "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABEL[quote.status] ?? quote.status}
        </span>
      </div>

      {requiredDate && (
        <div className={`rounded-xl p-4 border-2 ${daysUntil !== null && daysUntil < 0 ? "bg-rose-50 border-rose-400" : daysUntil !== null && daysUntil <= 7 ? "bg-amber-50 border-amber-400" : "bg-yellow-50 border-yellow-300"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Required delivery date</p>
          <p className="text-2xl font-extrabold text-ajs-dark">{requiredDate}</p>
          {daysUntil !== null && (
            <p className={`text-sm font-semibold mt-1 ${daysUntil < 0 ? "text-rose-600" : daysUntil <= 7 ? "text-amber-600" : "text-slate-500"}`}>
              {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? "Due today" : `${daysUntil} days remaining`}
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-ajs-light p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-3">Customer &amp; delivery</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-ajs-muted">Customer</dt>
          <dd className="font-semibold">
            {quote.contact_name}
            {quote.contact_company && <span className="font-normal text-ajs-muted"> — {quote.contact_company}</span>}
          </dd>
          {quote.contact_phone && (
            <>
              <dt className="text-ajs-muted">Phone</dt>
              <dd><a href={`tel:${quote.contact_phone}`} className="text-ajs-primary">{quote.contact_phone}</a></dd>
            </>
          )}
          {addr && (
            <>
              <dt className="text-ajs-muted">Delivery address</dt>
              <dd className="font-semibold">{addr}</dd>
            </>
          )}
          {quote.install_requested && (
            <>
              <dt className="text-ajs-muted">Installation</dt>
              <dd className="text-amber-700 font-semibold">Installation requested</dd>
            </>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="px-5 py-3 border-b border-ajs-light">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Parts to build / ship</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-ajs-light">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Part code</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-ajs-dark">Description</th>
              <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-ajs-dark">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ajs-light">
            {(items ?? []).map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3 font-mono text-xs text-ajs-muted font-bold">{i.sku}</td>
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3 text-center text-xl font-extrabold text-ajs-primary">{i.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StatusUpdateForm quoteId={quote.id} currentStatus={quote.status} />
    </div>
  );
}
