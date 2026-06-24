import { Resend } from "resend";
import { renderQuoteRequestPDF, renderOrderConfirmationPDF, renderWorkOrderPDF, renderInstallationQuotePDF } from "./quote-pdf";
import type { PDFItem, InstallPDFItem } from "./quote-pdf";
import { getLocale, getT } from "./i18n";
import type { MessageKey } from "./i18n";

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
  shipping_gbp_pence?: number | null;
  shipping_pallets?: number | null;
  currency?: string | null;
  fx_rate_used?: number | null;
  locale?: string | null;
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
  const t = getT(getLocale(quote.locale));
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const subtotalPence = items.reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const shippingPence = quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null;
  const grandTotalPence = subtotalPence + (shippingPence ?? 0);
  const pallets = quote.shipping_pallets;
  const shippingLabel = pallets
    ? t(pallets !== 1 ? "pdfShippingPallets" : "pdfShippingPallet", { count: pallets })
    : t("shipping" as MessageKey);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader(t("emailYourQuoteRequest"), quote.ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6">
      ${t("emailQuoteIntroBody", { ref: quote.ref })}
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">${t("emailItemsRequested")}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      ${itemRows(items, ccy, fx)}
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:8px 0;color:#475569;font-size:13px">${t("emailSubtotalExVat")}</td>
        <td style="padding:8px 0;font-weight:bold;color:#1e293b;font-size:13px;text-align:right;white-space:nowrap">${money(subtotalPence, ccy, fx)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 0;color:#475569;font-size:13px">${shippingLabel}</td>
        <td style="padding:4px 0;font-weight:bold;font-size:13px;text-align:right;white-space:nowrap;color:${shippingPence === null ? "#d97706" : "#1e293b"}">${shippingPence !== null ? money(shippingPence, ccy, fx) : "EXW"}</td>
      </tr>
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px">${t("emailTotalExVat")}</td>
        <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${money(grandTotalPence, ccy, fx)}</td>
      </tr>
    </table>
    ${ccy === "EUR" ? `<p style="color:#94a3b8;font-size:11px;margin:-16px 0 24px">${t("emailIndicativeEur")}</p>` : ""}

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <p style="color:#475569;font-size:13px;margin:0 0 16px;line-height:1.5">
        ${t("emailViewManageBody")}
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:#1886a1;color:#fff;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px">
        ${t("emailViewManageBtn")}
      </a>
      <p style="color:#94a3b8;font-size:11px;margin:12px 0 0">${t("emailLinkPersonal")}</p>
    </div>

    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.8">
      ${t("emailQuestions")}<br>
      <a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;text-decoration:none">rz@ajsspalding.co.uk</a>
      &nbsp;&middot;&nbsp; 01406&nbsp;424954
    </p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;line-height:1.6">
    ${t("emailFooterBody")}<br>
    ${t("emailFooterSubmitted")}
  </p>
</div>
</body></html>`;
}

function ajsNotifyHtml(quote: EmailQuoteRow, items: EmailItemRow[]): string {
  const ccy = quote.currency ?? "GBP";
  const fx  = quote.fx_rate_used ?? null;
  const subtotalPence = Number(quote.subtotal_gbp_pence);
  const shippingPence = quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null;
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
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Subtotal</td>
        <td style="padding:6px 0;font-size:13px;font-weight:bold">${money(subtotalPence, ccy, fx)}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Shipping${quote.shipping_pallets ? ` (${quote.shipping_pallets} pallet${quote.shipping_pallets !== 1 ? "s" : ""})` : ""}</td>
        <td style="padding:6px 0;font-size:13px;font-weight:bold">${shippingPence !== null ? money(shippingPence, ccy, fx) : "EXW"}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Total (ex-VAT)</td>
        <td style="padding:6px 0;font-size:14px;font-weight:bold;color:#1886a1">${money(subtotalPence + (shippingPence ?? 0), ccy, fx)}</td></tr>
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
        shipping_gbp_pence: quote.shipping_gbp_pence,
        shipping_pallets: quote.shipping_pallets,
        currency: quote.currency,
        fx_rate_used: quote.fx_rate_used,
        locale: quote.locale,
      },
      items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, line_total_gbp_pence: i.line_total_gbp_pence })),
    ),
  );
  const pdfAttachment = pdfBuf ? [{ filename: `Quote-${quote.ref}.pdf`, content: pdfBuf }] : undefined;
  console.log(`[email] quote PDF: ${pdfBuf ? pdfBuf.length + " bytes, attaching" : "null — sending without attachment"}`);

  const t = getT(getLocale(quote.locale));
  try {
    const [customerRes, ajsRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: recipients(quote.contact_email),
        subject: `${t("emailYourQuoteRequest")} ${quote.ref}`,
        html: customerHtml(quote, items, magicUrl),
        attachments: pdfAttachment,
      }),
      resend.emails.send({
        from: FROM,
        to: recipients(AJS_NOTIFY),
        subject: `New Redzone quote: ${quote.ref} — ${quote.contact_company ?? quote.contact_name} (${money(Number(quote.subtotal_gbp_pence) + (quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : 0), quote.currency ?? "GBP", quote.fx_rate_used ?? null)})`,
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
  site_name: string | null;
  site_address_line1: string | null;
  site_address_line2: string | null;
  site_address_city: string | null;
  site_address_postcode: string | null;
  site_country: string | null;
}

function orderConfirmationHtml(quote: OrderQuoteRow, items: EmailItemRow[]): string {
  const t = getT(getLocale(quote.locale));
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const subtotalPence = items.reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const shippingPence = quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null;
  const grandTotalPence = subtotalPence + (shippingPence ?? 0);
  const pallets = quote.shipping_pallets;
  const shippingLabel = pallets
    ? t(pallets !== 1 ? "pdfShippingPallets" : "pdfShippingPallet", { count: pallets })
    : t("shipping" as MessageKey);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader(t("emailOrderConfirmedLabel"), quote.ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6">
      ${t("emailOrderConfirmedBody", { ref: quote.ref })}
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">${t("emailItemsOrdered")}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      ${itemRows(items, ccy, fx)}
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:8px 0;color:#475569;font-size:13px">${t("emailSubtotalExVat")}</td>
        <td style="padding:8px 0;font-weight:bold;color:#1e293b;font-size:13px;text-align:right;white-space:nowrap">${money(subtotalPence, ccy, fx)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 0;color:#475569;font-size:13px">${shippingLabel}</td>
        <td style="padding:4px 0;font-weight:bold;font-size:13px;text-align:right;white-space:nowrap;color:${shippingPence === null ? "#d97706" : "#1e293b"}">${shippingPence !== null ? money(shippingPence, ccy, fx) : "EXW"}</td>
      </tr>
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px">${t("emailTotalExVat")}</td>
        <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${money(grandTotalPence, ccy, fx)}</td>
      </tr>
    </table>
    ${ccy === "EUR" ? `<p style="color:#94a3b8;font-size:11px;margin:-16px 0 24px">${t("emailIndicativeEur")}</p>` : ""}

    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.8">
      ${t("emailQuestions")}<br>
      <a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;text-decoration:none">rz@ajsspalding.co.uk</a>
      &nbsp;&middot;&nbsp; 01406&nbsp;424954
    </p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;line-height:1.6">
    ${t("emailFooterBody")}
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
      ${quote.site_name ? `<tr><td style="padding:5px 0;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b">Site</td>
          <td style="padding:5px 0;font-size:14px;font-weight:bold">${quote.site_name}</td></tr>` : ""}
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
    ${(() => {
      const sp = quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null;
      const pl = quote.shipping_pallets;
      const ccy = quote.currency ?? "GBP";
      const fx  = quote.fx_rate_used ?? null;
      const label = `Shipping${pl ? ` — ${pl} pallet${pl !== 1 ? "s" : ""}` : ""}`;
      const value = sp !== null ? money(sp, ccy, fx) : "EXW (customer arranges)";
      return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:20px">
      <span style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b">${label}:</span>
      <span style="font-size:14px;font-weight:bold;color:#1e293b;margin-left:8px">${value}</span>
    </div>`;
    })()}
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
    site_name: quote.site_name,
    site_address_line1: quote.site_address_line1, site_address_line2: quote.site_address_line2,
    site_address_city: quote.site_address_city, site_address_postcode: quote.site_address_postcode,
    site_country: quote.site_country, subtotal_gbp_pence: quote.subtotal_gbp_pence,
    shipping_gbp_pence: quote.shipping_gbp_pence, shipping_pallets: quote.shipping_pallets,
    currency: quote.currency, fx_rate_used: quote.fx_rate_used,
  };
  const pdfItems = items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, line_total_gbp_pence: i.line_total_gbp_pence }));

  const [confirmBuf, workOrderBuf] = await Promise.all([
    tryGeneratePDF("order-confirmation", () => renderOrderConfirmationPDF({ ...pdfQuote, locale: quote.locale }, pdfItems)),
    tryGeneratePDF("work-order", () => renderWorkOrderPDF(pdfQuote, pdfItems)),
  ]);
  const confirmationPdf = confirmBuf ? [{ filename: `Order-${quote.ref}.pdf`, content: confirmBuf }] : undefined;
  const workOrderPdf    = workOrderBuf ? [{ filename: `Work-Order-${quote.ref}.pdf`, content: workOrderBuf }] : undefined;

  const tConfirm = getT(getLocale(quote.locale));
  try {
    const [customerRes, workOrderRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: recipients(quote.contact_email),
        subject: `${tConfirm("emailOrderConfirmedLabel")}: ${quote.ref} — AJS Redzone`,
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

// ─── Accounts link email ─────────────────────────────────────────────────────

export async function sendAccountsLinkEmail(
  toEmail: string,
  ref: string,
  accountsUrl: string,
  fromContactName: string,
  fromCompany: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const sender = fromCompany
    ? `${fromContactName} at ${fromCompany}`
    : fromContactName;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader("Account details required", ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6">
      ${sender} has placed an order (<strong>${ref}</strong>) with AJS Redzone and asked you to
      complete the account &amp; billing information so an invoice can be raised.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <p style="color:#475569;font-size:13px;margin:0 0 16px;line-height:1.5">
        Click the button below to open the account details form. No login required.
      </p>
      <a href="${accountsUrl}" style="display:inline-block;background:#1886a1;color:#fff;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px">
        Complete Account Details &rarr;
      </a>
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

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipients(toEmail),
      subject: `Account details required: ${ref} — AJS Redzone`,
      html,
    });
    if (error) console.error("[email] accounts link failed:", error);
    else console.log(`[email] accounts link sent to ${toEmail}`);
  } catch (err) {
    console.error("[email] accounts link unexpected error:", err);
  }
}

// ─── Status update emails ─────────────────────────────────────────────────────

const STATUS_SUBJECT_KEY: Partial<Record<string, MessageKey>> = {
  order_confirmed:  "emailStatusSubjectOrderConfirmed",
  in_build:         "emailStatusSubjectInBuild",
  invoiced:         "emailStatusSubjectInvoiced",
  payment_received: "emailStatusSubjectPaymentReceived",
  ready_to_ship:    "emailStatusSubjectReadyToShip",
  shipped:          "emailStatusSubjectShipped",
  complete:         "emailStatusSubjectComplete",
  cancelled:        "emailStatusSubjectCancelled",
};

const STATUS_COLOUR: Partial<Record<string, { bg: string; border: string; text: string }>> = {
  order_confirmed:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  in_build:         { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
  invoiced:         { bg: "#fefce8", border: "#fde68a", text: "#92400e" },
  payment_received: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  ready_to_ship:    { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e" },
  shipped:          { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  complete:         { bg: "#f8fafc", border: "#e2e8f0", text: "#334155" },
  cancelled:        { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
};

function statusBody(
  t: ReturnType<typeof getT>,
  status: string,
  ref: string,
  trackingRef?: string,
  trackingUrl?: string,
  cancellationReason?: string,
): string {
  switch (status) {
    case "order_confirmed":
      return t("emailStatusBodyOrderConfirmed", { ref });
    case "in_build":
      return t("emailStatusBodyInBuild", { ref });
    case "invoiced":
      return t("emailStatusBodyInvoiced", { ref });
    case "payment_received":
      return t("emailStatusBodyPaymentReceived", { ref });
    case "ready_to_ship":
      return t("emailStatusBodyReadyToShip", { ref });
    case "shipped": {
      let trackingInfo = "";
      if (trackingRef) trackingInfo += t("emailStatusBodyShippedTracking", { trackingRef });
      if (trackingUrl) trackingInfo += ` <a href="${trackingUrl}" style="color:#b91c1c">${t("emailStatusBodyShippedTrackingLink")}</a>`;
      return t("emailStatusBodyShipped", { ref, trackingInfo });
    }
    case "complete":
      return t("emailStatusBodyComplete", { ref });
    case "cancelled": {
      const reasonSuffix = cancellationReason
        ? t("emailStatusBodyCancelledReason", { reason: cancellationReason })
        : "";
      return t("emailStatusBodyCancelled", { ref, reasonSuffix });
    }
    default:
      return t("emailStatusBodyFallback", { ref });
  }
}

function statusUpdateHtml(
  contactName: string,
  ref: string,
  status: string,
  locale: string,
  trackingRef?: string,
  trackingUrl?: string,
  cancellationReason?: string,
): string {
  const t = getT(getLocale(locale));
  const first = contactName.trim().split(" ")[0] ?? "there";
  const subjectKey = STATUS_SUBJECT_KEY[status];
  const subject = subjectKey ? t(subjectKey) : t("emailStatusSubjectCancelled");
  const colours = STATUS_COLOUR[status] ?? { bg: "#f8fafc", border: "#e2e8f0", text: "#334155" };
  const body = statusBody(t, status, ref, trackingRef, trackingUrl, cancellationReason);

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
      ${t("emailQuestions")}<br>
      <a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;text-decoration:none">rz@ajsspalding.co.uk</a>
      &nbsp;&middot;&nbsp; 01406&nbsp;424954
    </p>
  </div>

  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;line-height:1.6">
    ${t("emailFooterBody")}
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
  trackingUrl?: string,
  rzPmEmail?: string,
  cancellationReason?: string,
  locale?: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  if (!STATUS_SUBJECT_KEY[status]) return; // no email for quote_submitted

  const t = getT(getLocale(locale));
  const subjectKey = STATUS_SUBJECT_KEY[status]!;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `${t(subjectKey)}: ${ref} — AJS Redzone`;
  const override = process.env.RESEND_TEST_TO?.trim();
  const cc = !override && rzPmEmail ? [rzPmEmail] : undefined;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipients(contactEmail),
      cc,
      subject,
      html: statusUpdateHtml(contactName, ref, status, locale ?? "en", trackingRef, trackingUrl, cancellationReason),
    });
    if (error) console.error("[email] status update failed:", error);
    else console.log(`[email] status update sent: ${status} → ${contactEmail}${rzPmEmail ? ` (CC: ${rzPmEmail})` : ""}`);
  } catch (err) {
    console.error("[email] status update unexpected error:", err);
  }
}

// ─── Amended / revised quote email ───────────────────────────────────────────

export interface EmailAmendedItem {
  sku: string;
  name: string;
  qty: number;
  unit_price_gbp_pence: number;
  line_total_gbp_pence: number;
  discount_pct: number;
}

function amendedCustomerHtml(
  quote: EmailQuoteRow & {
    overall_discount_pct: number | null;
    shipping_override_pence: number | null;
    shipping_label: string | null;
    revision: number;
  },
  items: EmailAmendedItem[],
  magicUrl: string,
): string {
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  const ccy = quote.currency ?? "GBP";
  const fx = quote.fx_rate_used ?? null;
  const hasLineDiscount = items.some((i) => i.discount_pct > 0);
  const overallDiscPct = Number(quote.overall_discount_pct ?? 0);

  const unitHeader = hasLineDiscount
    ? `<th style="padding:6px 10px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;text-align:right">Unit</th>`
    : "";
  const discHeader = hasLineDiscount
    ? `<th style="padding:6px 10px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;text-align:center">Disc.</th>`
    : "";

  const itemRows = items.map((i) => {
    const unitCell = hasLineDiscount
      ? `<td style="padding:8px 10px;border-bottom:1px solid #e6ebed;font-size:12px;color:#64748b;text-align:right;white-space:nowrap">${money(i.unit_price_gbp_pence, ccy, fx)}</td>`
      : "";
    const discCell = hasLineDiscount
      ? (i.discount_pct > 0
        ? `<td style="padding:8px 10px;border-bottom:1px solid #e6ebed;font-size:12px;color:#059669;text-align:center;white-space:nowrap">${i.discount_pct}%&nbsp;off</td>`
        : `<td style="padding:8px 10px;border-bottom:1px solid #e6ebed"></td>`)
      : "";
    return `<tr>
      <td style="padding:8px 0;font-size:13px;color:#475569;border-bottom:1px solid #e6ebed">
        <span style="font-family:monospace;font-size:11px;color:#94a3b8">${i.sku}</span><br>${i.name}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e6ebed;font-size:13px;color:#64748b;text-align:center;white-space:nowrap">&times;&nbsp;${i.qty}</td>
      ${unitCell}${discCell}
      <td style="padding:8px 0;border-bottom:1px solid #e6ebed;font-size:13px;font-weight:bold;color:#1e293b;text-align:right;white-space:nowrap">${money(i.line_total_gbp_pence, ccy, fx)}</td>
    </tr>`;
  }).join("");

  const colspan = hasLineDiscount ? 4 : 2;
  const subtotal = items.reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const discountAmt = Math.round(subtotal * overallDiscPct / 100);
  const discountedSubtotal = subtotal - discountAmt;
  const shippingPence = quote.shipping_override_pence != null
    ? Number(quote.shipping_override_pence)
    : (quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null);
  const shippingLabel = quote.shipping_label || "Shipping";
  const grandTotal = discountedSubtotal + (shippingPence ?? 0);

  const overallDiscRow = overallDiscPct > 0 ? `
    <tr>
      <td colspan="${colspan}" style="padding:4px 0;font-size:13px;color:#059669;text-align:right">Overall discount (${overallDiscPct}%)</td>
      <td style="padding:4px 0;font-size:13px;font-weight:bold;color:#059669;text-align:right;white-space:nowrap">−${money(discountAmt, ccy, fx)}</td>
    </tr>` : "";

  const shippingRow = shippingPence !== null
    ? `<tr>
        <td colspan="${colspan}" style="padding:4px 0;font-size:13px;color:#475569;text-align:right">${shippingLabel}</td>
        <td style="padding:4px 0;font-size:13px;font-weight:bold;color:#1e293b;text-align:right;white-space:nowrap">${money(shippingPence, ccy, fx)}</td>
      </tr>`
    : `<tr>
        <td colspan="${colspan}" style="padding:4px 0;font-size:13px;color:#475569;text-align:right">${shippingLabel}</td>
        <td style="padding:4px 0;font-size:13px;font-weight:bold;color:#d97706;text-align:right">EXW</td>
      </tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader(`Revised Quote — Rev. ${quote.revision}`, quote.ref)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6">
      We've updated your quote — please see the revised breakdown below.
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Revised items</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr>
          <th style="padding:6px 0;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;text-align:left">Item</th>
          <th style="padding:6px 10px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;text-align:center">Qty</th>
          ${unitHeader}${discHeader}
          <th style="padding:6px 0;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #e6ebed">
          <td colspan="${colspan}" style="padding:8px 0;font-size:13px;color:#475569;text-align:right">Subtotal (ex-VAT)</td>
          <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#1e293b;text-align:right;white-space:nowrap">${money(subtotal, ccy, fx)}</td>
        </tr>
        ${overallDiscRow}
        ${shippingRow}
        <tr style="border-top:2px solid #e6ebed">
          <td colspan="${colspan}" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right">Total (ex-VAT)</td>
          <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${money(grandTotal, ccy, fx)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <p style="color:#475569;font-size:13px;margin:0 0 16px;line-height:1.5">
        View and manage your quote online — accept, request changes, or ask a question.
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:#1886a1;color:#fff;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px">
        View &amp; manage your quote &rarr;
      </a>
      <p style="color:#94a3b8;font-size:11px;margin:12px 0 0">This link is personal to you — please don't share it.</p>
    </div>

    <p style="color:#64748b;font-size:13px;margin:0;line-height:1.8">
      Any questions? Get in touch:<br>
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

export async function sendAmendedQuoteEmail(
  quote: {
    ref: string;
    contact_name: string;
    contact_email: string;
    contact_company: string | null;
    shipping_gbp_pence: number | null;
    shipping_override_pence: number | null;
    shipping_label: string | null;
    shipping_pallets: number | null;
    overall_discount_pct: number | null;
    currency: string | null;
    fx_rate_used: number | null;
    locale: string | null;
    revision: number;
  },
  items: EmailAmendedItem[],
  magicUrl: string,
): Promise<{ error?: string }> {
  if (!process.env.RESEND_API_KEY) return { error: "Email not configured" };

  const overallDiscPct = Number(quote.overall_discount_pct ?? 0);
  const shippingPence = quote.shipping_override_pence != null
    ? Number(quote.shipping_override_pence)
    : (quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null);

  const pdfItems: PDFItem[] = items.map((i) => ({
    sku: i.sku,
    name: i.name,
    qty: i.qty,
    line_total_gbp_pence: overallDiscPct > 0
      ? Math.round(Number(i.line_total_gbp_pence) * (1 - overallDiscPct / 100))
      : Number(i.line_total_gbp_pence),
  }));

  const pdfBuf = await tryGeneratePDF("revised-quote", () =>
    renderQuoteRequestPDF(
      {
        ref: `${quote.ref} — Rev. ${quote.revision}`,
        contact_name: quote.contact_name,
        contact_email: quote.contact_email,
        contact_company: quote.contact_company,
        subtotal_gbp_pence: pdfItems.reduce((s, i) => s + Number(i.line_total_gbp_pence), 0),
        shipping_gbp_pence: shippingPence,
        shipping_pallets: quote.shipping_pallets,
        currency: quote.currency,
        fx_rate_used: quote.fx_rate_used,
        locale: quote.locale,
      },
      pdfItems,
    ),
  );

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: recipients(quote.contact_email),
    subject: `Revised quote: ${quote.ref} — Rev. ${quote.revision}`,
    html: amendedCustomerHtml(
      { ...quote, subtotal_gbp_pence: 0 },
      items,
      magicUrl,
    ),
    attachments: pdfBuf
      ? [{ filename: `Revised-Quote-${quote.ref}-Rev${quote.revision}.pdf`, content: pdfBuf }]
      : undefined,
  });

  if (error) return { error: error.message };
  return {};
}

// ─── Installation budget email ────────────────────────────────────────────────

interface InstallBudgetEmailParams {
  quoteRef: string;
  hardwareRef: string | null;
  customerEmail: string;
  customerName: string;
  companyName: string | null;
  siteName: string | null;
  siteAddressLine1: string | null;
  siteAddressLine2: string | null;
  siteAddressCity: string | null;
  siteAddressPostcode: string | null;
  siteCountry: string | null;
  requiredDate: string | null;
  budgetFromPence: number;
  budgetToPence: number;
  notes: string | null;
  containmentNotes: string | null;
  paymentTerms: string | null;
  items: InstallPDFItem[];
  locale?: string | null;
}

function installBudgetHtml(p: InstallBudgetEmailParams): string {
  const t = getT(getLocale(p.locale));
  const first = p.customerName.trim().split(" ")[0] ?? "there";
  const fmt = (pence: number) =>
    "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const introKey: MessageKey = p.hardwareRef ? "emailInstallBudgetIntroHardware" : "emailInstallBudgetIntro";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  ${emailHeader(t("emailInstallBudgetLabel"), p.quoteRef)}

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6">
      ${t(introKey, p.hardwareRef ? { ref: p.hardwareRef } : {})}
    </p>

    <div style="background:#f0f9ff;border:2px solid #1886a1;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
      <div style="color:#64748b;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${p.budgetFromPence >= p.budgetToPence ? t("emailInstallFixedPriceLabel") : t("emailInstallBudgetEstimateLabel")}</div>
      <div style="color:#05618e;font-size:32px;font-weight:900">${p.budgetFromPence >= p.budgetToPence ? fmt(p.budgetFromPence) : `${fmt(p.budgetFromPence)} – ${fmt(p.budgetToPence)}`}</div>
    </div>

    ${p.containmentNotes ? `
    <div style="background:#f8fafc;border:1px solid #e6ebed;border-radius:8px;padding:16px;margin-bottom:16px">
      <p style="color:#64748b;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">${t("emailInstallContainmentLabel")}</p>
      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0">${p.containmentNotes.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    ${p.notes ? `
    <div style="background:#f8fafc;border:1px solid #e6ebed;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="color:#64748b;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">${t("emailInstallNotesLabel")}</p>
      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0">${p.notes.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 16px">
      ${t("emailInstallBudgetNotice")}
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px">
      ${t("emailInstallDiscuss")}
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="padding:4px 12px 4px 0;font-size:13px;color:#64748b">Phone:</td>
        <td style="padding:4px 0;font-size:13px;font-weight:bold;color:#1e293b">01406 424954</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;font-size:13px;color:#64748b">Email:</td>
        <td style="padding:4px 0;font-size:13px"><a href="mailto:rz@ajsspalding.co.uk" style="color:#1886a1;font-weight:bold">rz@ajsspalding.co.uk</a></td>
      </tr>
    </table>

    <p style="color:#94a3b8;font-size:11px;margin:0">
      ${t("emailInstallBudgetFooter", { ref: p.quoteRef })}
    </p>
  </div>
</div>
</body></html>`;
}

export async function sendInstallationBudgetEmail(p: InstallBudgetEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping installation budget email");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  let pdfBuf: Buffer | null = null;
  try {
    pdfBuf = await Promise.race([
      renderInstallationQuotePDF(
        {
          ref: p.quoteRef,
          hardware_ref: p.hardwareRef,
          customer_name: p.customerName,
          customer_email: p.customerEmail,
          company_name: p.companyName,
          site_name: p.siteName,
          site_address_line1: p.siteAddressLine1,
          site_address_line2: p.siteAddressLine2,
          site_address_city: p.siteAddressCity,
          site_address_postcode: p.siteAddressPostcode,
          site_country: p.siteCountry,
          required_date: p.requiredDate,
          budget_from_pence: p.budgetFromPence,
          budget_to_pence: p.budgetToPence,
          ajs_notes: p.notes,
          containment_notes: p.containmentNotes,
          payment_terms: p.paymentTerms,
          locale: p.locale,
        },
        p.items,
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("PDF timeout")), 8000)),
    ]);
  } catch (err) {
    console.error("[email] install PDF generation failed:", err);
  }

  const tInstall = getT(getLocale(p.locale));
  try {
    const override = process.env.RESEND_TEST_TO?.trim();
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipients(p.customerEmail),
      cc: override ? undefined : [AJS_NOTIFY],
      subject: `${tInstall("emailInstallBudgetLabel")} — ${p.quoteRef}`,
      html: installBudgetHtml(p),
      attachments: pdfBuf ? [{ filename: `Install-Quote-${p.quoteRef}.pdf`, content: pdfBuf }] : undefined,
    });
    if (error) console.error("[email] installation budget email failed:", error);
    else console.log(`[email] installation budget sent → ${p.customerEmail}`);
  } catch (err) {
    console.error("[email] installation budget unexpected error:", err);
  }
}
