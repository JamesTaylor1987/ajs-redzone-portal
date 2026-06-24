import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { StatusUpdateForm } from "./StatusUpdateForm";
import { AssignPMForm } from "./AssignPMForm";
import { WinProbabilityForm } from "./WinProbabilityForm";
import { AdminNotesForm } from "./AdminNotesForm";
import { EditQuoteItemsForm } from "./EditQuoteItemsForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const supabase = getServiceClient();

  const [{ data: quote }, { data: pms }, { data: products }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", params.id).single(),
    supabase.from("rz_pms").select("id, name, email, type").order("name"),
    supabase.from("products").select("id, sku, name, price_gbp_pence").eq("active", true).order("sku"),
  ]);

  if (!quote) notFound();

  const { data: items } = await supabase
    .from("quote_items")
    .select("id, sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence, discount_pct")
    .eq("quote_id", quote.id);

  const effectiveShippingPence = quote.shipping_override_pence != null
    ? Number(quote.shipping_override_pence)
    : (quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null);
  const subtotalPence = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const shippingPence = effectiveShippingPence;
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
      <StatusUpdateForm
        quoteId={quote.id}
        currentStatus={quote.status}
        currentTrackingRef={quote.tracking_ref}
        currentTrackingUrl={quote.tracking_url}
      />

      {/* Win probability — only for open quotes */}
      {quote.status === "quote_submitted" && (
        <WinProbabilityForm quoteId={quote.id} currentProbability={quote.win_probability ?? null} />
      )}

      {/* Redzone PM assignment */}
      <AssignPMForm
        quoteId={quote.id}
        currentPMId={quote.rz_pm_id ?? null}
        pms={pms ?? []}
      />

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

      {/* Items — editable */}
      <EditQuoteItemsForm
        quoteId={quote.id}
        initialItems={(items ?? []).map((i) => ({
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          unit_price_gbp_pence: Number(i.unit_price_gbp_pence),
          discount_pct: Number(i.discount_pct ?? 0),
        }))}
        products={(products ?? []).map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          price_gbp_pence: Number(p.price_gbp_pence),
        }))}
        currentShippingPence={effectiveShippingPence}
        currentShippingLabel={(quote.shipping_label as string | null) ?? null}
        currentOverallDiscountPct={quote.overall_discount_pct != null ? Number(quote.overall_discount_pct) : null}
      />

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

      {/* Internal notes */}
      <AdminNotesForm quoteId={quote.id} currentNotes={quote.admin_notes ?? null} />

      {/* Dates */}
      <Card title="Timestamps">
        <Row label="Submitted"     value={quote.submitted_at  ? new Date(quote.submitted_at).toLocaleString("en-GB")  : null} />
        <Row label="Accepted"      value={quote.accepted_at   ? new Date(quote.accepted_at).toLocaleString("en-GB")   : null} />
        <Row label="Order confirmed" value={quote.confirmed_at ? new Date(quote.confirmed_at).toLocaleString("en-GB") : null} />
        <Row label="Shipped"       value={quote.shipped_at    ? new Date(quote.shipped_at).toLocaleString("en-GB")    : null} />
        <Row label="Completed"     value={quote.completed_at  ? new Date(quote.completed_at).toLocaleString("en-GB")  : null} />
        {quote.amended_at && (
          <Row label="Last revised" value={`${new Date(quote.amended_at).toLocaleString("en-GB")}${quote.revision ? ` (Rev. ${quote.revision})` : ""}`} />
        )}
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
