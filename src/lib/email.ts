import { Resend } from "resend";
import { renderQuoteRequestPDF, renderOrderConfirmationPDF, renderWorkOrderPDF } from "./quote-pdf";

const PDF_TIMEOUT_MS = 8_000;

async function tryGeneratePDF(
  name: string,
  fn: () => Promise<Buffer>,
): Promise<Buffer | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`PDF timeout after ${PDF_TIMEOUT_MS}ms`)), PDF_TIMEOUT_MS),
      ),
    ]);
  } catch (err) {
    console.error(`[email] ${name} PDF failed:`, err);
    return null;
  }
}

const FROM = process.env.RESEND_FROM_EMAIL
  ? `AJS Redzone <${process.env.RESEND_FROM_EMAIL}>`
  : "AJS Redzone <rz@ajsspalding.co.uk>";

const AJS_NOTIFY = "rz@ajsspalding.co.uk";

const AJS_LOGO = "https://ajsspalding.co.uk/img/ajs-logo@2x.png";
const RZ_ICON  = "https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg";

function recipients(...addresses: string[]): string[] {
  const override = process.env.RESEND_TEST_TO?.trim();
  return override ? [override] : addresses;
}

function money(gbpPence: number | string, currency = "GBP", fxRate: number | null = null): string {
  const pence = Number(gbpPence);
  if (currency === "EUR" && fxRate && fxRate > 1) {
    return "€" + (pence * fxRate / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Legacy alias used by internal notify emails (always GBP)
function gbp(pence: number | string): string {
  return money(pence, "GBP");
}

function emailHeader(label: string, ref: string): string {
  return `
  <div style="background:#fff;border-radius:12px 12px 0 0;padding:20px 32px 16px;border:1px solid #e6ebed;border-bottom:3px solid #1886a1">
    <table cellpadding="0" cellspacing="0" style="width:100%">
      <tr>
        <td style="vertical-align:middle">
          <img src="${AJS_LOGO}" alt="AJS Control &amp; Automation" height="28" style="display:block;height:28px;width:auto">
        </td>
        <td style="vertical-align:middle;text-align:right">
          <img src="${RZ_ICON}" alt="" height="18" style="display:inline;height:18px;width:18px;vertical-align:middle;margin-right:5px">
          <span style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#1886a1;vertical-align:middle">Redzone</span>
        </td>
      </tr>
    </table>
    <div style="color:#94a3b8;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin-top:14px">${label}</div>
    <div style="color:#05618e;font-size:24px;font-weight:900;margin-top:2px">${ref}</div>
  </div>`;
}

export interface EmailQuoteRow {
  ref: string;
  contact_name: string;
  contact_email: string;
  contact_company: string | null;
  subtotal_gbp_pence: number | string;
  currency?: string | null;
  fx_rate_used?: number | null;
}

export interface EmailItemRow {
  sku: string;
  name: string;
  qty: number;
  line_total_gbp_pence: number | string;
}

function itemRows(items: EmailItemRow[], ccy = "GBP", fx: number | null = null): string {
  return items
    .map(
      (i) => `
      <tr style="border-bottom:1px solid #e6ebed">
        <td style="padding:8px 0;font-size:13px;color:#475569">
          <span style="font-family:monospace;font-size:11px;color:#94a3b8">${i.sku}</span><br>${i.name}
        </td>
        <td style="padding:8px 12px;font-size:13px;color:#64748b;text-align:center;white-space:nowrap">&times;&nbsp;${i.qty}</td>
        <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#1e293b;text-align:right;white-space:nowrap">${money(i.line_total_gbp_pence, ccy, fx)}</td>
      </tr>`,
    )
    .join("");
}

function customerHtml(quote: EmailQuoteRow, items: EmailItemRow[], magicUrl: string): string {
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const totalPence = items.reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader("Your quote request", quote.ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6">
      Thanks for your quote request &mdash; reference <strong>${quote.ref}</strong> has been assigned.
      The AJS Redzone team will review your request and be in touch shortly to confirm pricing and lead times.
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Items Requested</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      ${itemRows(items, ccy, fx)}
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px">Subtotal (ex-VAT)</td>
        <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${money(totalPence, ccy, fx)}</td>
      </tr>
    </table>
    ${ccy === "EUR" ? `<p style="color:#94a3b8;font-size:11px;margin:-16px 0 24px">Indicative EUR rate &mdash; invoice issued in GBP.</p>` : ""}

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <p style="color:#475569;font-size:13px;margin:0 0 16px;line-height:1.5">
        Use the button below to return to your quote at any time &mdash; to amend it or accept and place your order.
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:#1886a1;color:#fff;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px">
        View &amp; Manage Your Quote &rarr;
      </a>
      <p style="color:#94a3b8;font-size:11px;margin:12px 0 0">This link is personal to you and expires after 90&nbsp;days.</p>
    </div>

    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.8">
      Questions? Contact the AJS Redzone team:<br>
      <a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;text-decoration:none">rz@ajsspalding.co.uk</a>
      &nbsp;&middot;&nbsp; 01406&nbsp;424954
    </p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;line-height:1.6">
    AJS Spalding Ltd &nbsp;&middot;&nbsp; Redzone Hardware Portal<br>
    You received this because you submitted a quote request.
  </p>
</div>
</body></html>`;
}

function ajsNotifyHtml(quote: EmailQuoteRow, items: EmailItemRow[]): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#05618e;font-size:20px;margin:0 0 16px">New quote: ${quote.ref}</h1>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:6px 0;font-size:13px;width:140px;color:#64748b">Customer</td>
        <td style="padding:6px 0;font-size:13px;font-weight:bold">${quote.contact_name}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Company</td>
        <td style="padding:6px 0;font-size:13px">${quote.contact_company ?? "&mdash;"}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Email</td>
        <td style="padding:6px 0;font-size:13px">${quote.contact_email}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Total (ex-VAT)</td>
        <td style="padding:6px 0;font-size:14px;font-weight:bold;color:#1886a1">${gbp(quote.subtotal_gbp_pence)}</td></tr>
  </table>
  <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 8px">Items</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">
    ${itemRows(items)}
  </table>
  <p style="font-size:12px;color:#94a3b8;margin:0">Submitted via AJS Redzone Portal.</p>
</body></html>`;
}

export async function sendQuoteEmails(
  quote: EmailQuoteRow,
  items: EmailItemRow[],
  magicUrl: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const pdfBuf = await tryGeneratePDF("quote", () =>
    renderQuoteRequestPDF(
      {
        ref: quote.ref,
        contact_name: quote.contact_name,
        contact_email: quote.contact_email,
        contact_company: quote.contact_company,
        subtotal_gbp_pence: quote.subtotal_gbp_pence,
        currency: quote.currency,
        fx_rate_used: quote.fx_rate_used,
      },
      items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, line_total_gbp_pence: i.line_total_gbp_pence })),
    ),
  );
  const pdfAttachment = pdfBuf ? [{ filename: `quote-${quote.ref}.pdf`, content: pdfBuf }] : undefined;
  console.log(`[email] quote PDF: ${pdfBuf ? pdfBuf.length + " bytes, attaching" : "null — sending without attachment"}`);

  try {
    const [customerRes, ajsRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: recipients(quote.contact_email),
        subject: `Your Redzone quote ${quote.ref}`,
        html: customerHtml(quote, items, magicUrl),
        attachments: pdfAttachment,
      }),
      resend.emails.send({
        from: FROM,
        to: recipients(AJS_NOTIFY),
        subject: `New Redzone quote: ${quote.ref} — ${quote.contact_company ?? quote.contact_name} (${gbp(quote.subtotal_gbp_pence)})`,
        html: ajsNotifyHtml(quote, items),
      }),
    ]);
    if (customerRes.error) console.error("[email] customer send failed:", customerRes.error);
    if (ajsRes.error) console.error("[email] AJS notify failed:", ajsRes.error);
  } catch (err) {
    console.error("[email] unexpected error:", err);
  }
}

// ─── Order confirmation emails ───────────────────────────────────────────────

export interface OrderQuoteRow extends EmailQuoteRow {
  contact_phone: string | null;
  required_date: string | null;
  install_requested: boolean;
  site_address_line1: string | null;
  site_address_line2: string | null;
  site_address_city: string | null;
  site_address_postcode: string | null;
  site_country: string | null;
}

function orderConfirmationHtml(quote: OrderQuoteRow, items: EmailItemRow[]): string {
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const totalPence = items.reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader("Order confirmed", quote.ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6">
      Thank you &mdash; your order <strong>${quote.ref}</strong> has been confirmed.
      An invoice will be issued within 24 hours, payable 100% prior to shipment.
      Delivery is on DAP terms.
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Items Ordered</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      ${itemRows(items, ccy, fx)}
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px">Total (ex-VAT)</td>
        <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${money(totalPence, ccy, fx)}</td>
      </tr>
    </table>
    ${ccy === "EUR" ? `<p style="color:#94a3b8;font-size:11px;margin:-16px 0 24px">Indicative EUR rate &mdash; invoice issued in GBP.</p>` : ""}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;margin-bottom:24px">
      <p style="color:#166534;font-size:13px;margin:0;line-height:1.6">
        <strong>What happens next:</strong> You will receive an invoice within 24 hours.
        Once payment is received, your order will move into production.
        You will receive automated updates at each stage.
      </p>
    </div>

    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.8">
      Questions? Contact the AJS Redzone team:<br>
      <a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;text-decoration:none">rz@ajsspalding.co.uk</a>
      &nbsp;&middot;&nbsp; 01406&nbsp;424954
    </p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;line-height:1.6">
    AJS Spalding Ltd &nbsp;&middot;&nbsp; Redzone Hardware Portal
  </p>
</div>
</body></html>`;
}

function workOrderHtml(quote: OrderQuoteRow, items: EmailItemRow[]): string {
  const requiredDate = quote.required_date
    ? new Date(quote.required_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "NOT SPECIFIED";

  const addressParts = [
    quote.site_address_line1,
    quote.site_address_line2,
    quote.site_address_city,
    quote.site_address_postcode,
    quote.site_country,
  ].filter(Boolean);
  const deliveryAddress = addressParts.length ? addressParts.join(", ") : "Not specified";

  const partRows = items
    .map(
      (i) => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 8px;font-family:monospace;font-size:14px;font-weight:bold;color:#1e293b;white-space:nowrap">${i.sku}</td>
        <td style="padding:10px 8px;font-size:14px;color:#1e293b">${i.name}</td>
        <td style="padding:10px 8px;font-size:18px;font-weight:900;color:#05618e;text-align:center;white-space:nowrap">${i.qty}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:640px;margin:0 auto;padding:0">
  <div style="background:#05618e;padding:20px 28px">
    <div style="color:rgba(255,255,255,0.7);font-size:11px;text-transform:uppercase;letter-spacing:2px">AJS Redzone — Work Order</div>
    <div style="color:#fff;font-size:28px;font-weight:900;margin-top:4px">${quote.ref}</div>
  </div>
  <div style="background:#fef9c3;border-bottom:3px solid #eab308;padding:16px 28px">
    <div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#854d0e;margin-bottom:4px">Required delivery date</div>
    <div style="font-size:22px;font-weight:900;color:#1e293b">${requiredDate}</div>
  </div>
  <div style="padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:5px 0;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b;width:160px">Customer</td>
          <td style="padding:5px 0;font-size:14px;font-weight:bold">${quote.contact_name}${quote.contact_company ? ` &mdash; ${quote.contact_company}` : ""}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b">Phone</td>
          <td style="padding:5px 0;font-size:14px">${quote.contact_phone ?? "&mdash;"}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b;vertical-align:top">Delivery address</td>
          <td style="padding:5px 0;font-size:14px;font-weight:bold">${deliveryAddress}</td></tr>
    </table>
    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px">Parts to build / ship</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:24px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0">Part code</th>
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0">Description</th>
          <th style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;text-align:center;border-bottom:1px solid #e2e8f0">Qty</th>
        </tr>
      </thead>
      <tbody>${partRows}</tbody>
    </table>
    ${quote.install_requested ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:12px 16px;margin-bottom:20px"><p style="color:#9a3412;font-size:13px;font-weight:bold;margin:0">Installation requested — separate installation quote in progress.</p></div>` : ""}
    <p style="font-size:12px;color:#94a3b8;margin:0">Generated by AJS Redzone Portal &nbsp;&middot;&nbsp; ${quote.ref}</p>
  </div>
</body></html>`;
}

export async function sendOrderConfirmationEmails(
  quote: OrderQuoteRow,
  items: EmailItemRow[],
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping order confirmation emails");
    return;
  }

  const workOrderRecipients = process.env.WORK_ORDER_EMAILS
    ? process.env.WORK_ORDER_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
    : [AJS_NOTIFY];

  const resend = new Resend(process.env.RESEND_API_KEY);

  const pdfQuote = {
    ref: quote.ref, contact_name: quote.contact_name, contact_email: quote.contact_email,
    contact_company: quote.contact_company, contact_phone: quote.contact_phone,
    required_date: quote.required_date, install_requested: quote.install_requested,
    site_address_line1: quote.site_address_line1, site_address_line2: quote.site_address_line2,
    site_address_city: quote.site_address_city, site_address_postcode: quote.site_address_postcode,
    site_country: quote.site_country, subtotal_gbp_pence: quote.subtotal_gbp_pence,
    currency: quote.currency, fx_rate_used: quote.fx_rate_used,
  };
  const pdfItems = items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, line_total_gbp_pence: i.line_total_gbp_pence }));

  const [confirmBuf, workOrderBuf] = await Promise.all([
    tryGeneratePDF("order-confirmation", () => renderOrderConfirmationPDF(pdfQuote, pdfItems)),
    tryGeneratePDF("work-order", () => renderWorkOrderPDF(pdfQuote, pdfItems)),
  ]);
  const confirmationPdf = confirmBuf ? [{ filename: `order-${quote.ref}.pdf`, content: confirmBuf }] : undefined;
  const workOrderPdf    = workOrderBuf ? [{ filename: `work-order-${quote.ref}.pdf`, content: workOrderBuf }] : undefined;

  try {
    const [customerRes, workOrderRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: recipients(quote.contact_email),
        subject: `Order confirmed: ${quote.ref} — AJS Redzone`,
        html: orderConfirmationHtml(quote, items),
        attachments: confirmationPdf,
      }),
      resend.emails.send({
        from: FROM,
        to: recipients(...workOrderRecipients),
        subject: `Work order: ${quote.ref} — ${quote.contact_company ?? quote.contact_name}`,
        html: workOrderHtml(quote, items),
        attachments: workOrderPdf,
      }),
    ]);
    if (customerRes.error) console.error("[email] order confirmation failed:", customerRes.error);
    if (workOrderRes.error) console.error("[email] work order failed:", workOrderRes.error);
  } catch (err) {
    console.error("[email] order confirmation unexpected error:", err);
  }
}

// ─── Status update emails ─────────────────────────────────────────────────────

const STATUS_SUBJECT: Partial<Record<string, string>> = {
  order_confirmed: "Order confirmed",
  in_build:        "Your order is in production",
  ready_to_ship:   "Your order is ready to despatch",
  shipped:         "Your order has been shipped",
  complete:        "Your order is complete",
  cancelled:       "Order update",
};

const STATUS_COLOUR: Partial<Record<string, { bg: string; border: string; text: string }>> = {
  order_confirmed: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  in_build:        { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
  ready_to_ship:   { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e" },
  shipped:         { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  complete:        { bg: "#f8fafc", border: "#e2e8f0", text: "#334155" },
  cancelled:       { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
};

const STATUS_BODY: Partial<Record<string, (ref: string, trackingRef?: string) => string>> = {
  order_confirmed: (ref) =>
    `Your order <strong>${ref}</strong> has been confirmed by the AJS Redzone team. An invoice will be issued within 24 hours, payable 100% prior to shipment. Once payment is received your order moves into production and you will receive further updates at each stage.`,
  in_build: (ref) =>
    `Your order <strong>${ref}</strong> is now in production. Our workshop team are building your hardware. We&rsquo;ll be in touch again when it&rsquo;s ready to despatch.`,
  ready_to_ship: (ref) =>
    `Great news &mdash; your order <strong>${ref}</strong> has been built and is ready to despatch. Our team will be in touch shortly to arrange delivery.`,
  shipped: (ref, trackingRef) =>
    `Your order <strong>${ref}</strong> is on its way.${trackingRef ? ` Your tracking reference is <strong>${trackingRef}</strong>.` : ""} Delivery is on DAP terms. Please contact us if you have any questions.`,
  complete: (ref) =>
    `Your order <strong>${ref}</strong> is now complete. Thank you for your business &mdash; we hope everything arrived in perfect condition. Please don&rsquo;t hesitate to get in touch if you need anything.`,
  cancelled: (ref) =>
    `Your order <strong>${ref}</strong> has been cancelled. If you believe this is an error or have any questions, please contact the AJS Redzone team directly.`,
};

function statusUpdateHtml(
  contactName: string,
  ref: string,
  status: string,
  trackingRef?: string,
): string {
  const first = contactName.trim().split(" ")[0] ?? "there";
  const subject = STATUS_SUBJECT[status] ?? "Order update";
  const colours = STATUS_COLOUR[status] ?? { bg: "#f8fafc", border: "#e2e8f0", text: "#334155" };
  const bodyFn = STATUS_BODY[status];
  const body = bodyFn ? bodyFn(ref, trackingRef) : `Your order <strong>${ref}</strong> has been updated. Status: ${status}.`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader(subject, ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 16px">Hi ${first},</p>
    <div style="background:${colours.bg};border:1px solid ${colours.border};border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="color:${colours.text};font-size:14px;margin:0;line-height:1.6">${body}</p>
    </div>
    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.8">
      Questions? Contact the AJS Redzone team:<br>
      <a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;text-decoration:none">rz@ajsspalding.co.uk</a>
      &nbsp;&middot;&nbsp; 01406&nbsp;424954
    </p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;line-height:1.6">
    AJS Spalding Ltd &nbsp;&middot;&nbsp; Redzone Hardware Portal
  </p>
</div>
</body></html>`;
}

export async function sendStatusUpdateEmail(
  contactName: string,
  contactEmail: string,
  ref: string,
  status: string,
  trackingRef?: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  if (!STATUS_SUBJECT[status]) return; // no email for quote_submitted

  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `${STATUS_SUBJECT[status]}: ${ref} — AJS Redzone`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipients(contactEmail),
      subject,
      html: statusUpdateHtml(contactName, ref, status, trackingRef),
    });
    if (error) console.error("[email] status update failed:", error);
    else console.log(`[email] status update sent: ${status} → ${contactEmail}`);
  } catch (err) {
    console.error("[email] status update unexpected error:", err);
  }
}
