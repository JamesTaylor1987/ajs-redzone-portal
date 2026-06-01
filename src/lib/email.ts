import { Resend } from "resend";

// RESEND_FROM_EMAIL: use onboarding@resend.dev until ajsspalding.co.uk is verified in Resend.
// RESEND_TEST_TO: when set, all emails are redirected here (Resend shared-domain restriction).
const FROM = process.env.RESEND_FROM_EMAIL
  ? `AJS Redzone <${process.env.RESEND_FROM_EMAIL}>`
  : "AJS Redzone <rz@ajsspalding.co.uk>";

const AJS_NOTIFY = "rz@ajsspalding.co.uk";

function recipients(...addresses: string[]): string[] {
  const override = process.env.RESEND_TEST_TO?.trim();
  return override ? [override] : addresses;
}

interface EmailQuoteRow {
  ref: string;
  contact_name: string;
  contact_email: string;
  contact_company: string | null;
  subtotal_gbp_pence: number | string;
}

interface EmailItemRow {
  sku: string;
  name: string;
  qty: number;
  line_total_gbp_pence: number | string;
}

function gbp(pence: number | string): string {
  return (
    "£" +
    (Number(pence) / 100).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function itemRows(items: EmailItemRow[]): string {
  return items
    .map(
      (i) => `
      <tr style="border-bottom:1px solid #e6ebed">
        <td style="padding:8px 0;font-size:13px;color:#475569">
          <span style="font-family:monospace;font-size:11px;color:#94a3b8">${i.sku}</span><br>${i.name}
        </td>
        <td style="padding:8px 12px;font-size:13px;color:#64748b;text-align:center;white-space:nowrap">&times;&nbsp;${i.qty}</td>
        <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#1e293b;text-align:right;white-space:nowrap">${gbp(i.line_total_gbp_pence)}</td>
      </tr>`
    )
    .join("");
}

function customerHtml(quote: EmailQuoteRow, items: EmailItemRow[], magicUrl: string): string {
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:linear-gradient(135deg,#05618e,#1886a1);border-radius:12px 12px 0 0;padding:24px 32px">
    <div style="color:rgba(255,255,255,0.7);font-size:11px;text-transform:uppercase;letter-spacing:2px">AJS Redzone</div>
    <div style="color:#fff;font-size:26px;font-weight:900;margin-top:4px">${quote.ref}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6">
      Thanks for your quote request &mdash; reference <strong>${quote.ref}</strong> has been assigned.
      The AJS Redzone team will review your request and be in touch shortly to confirm pricing and lead times.
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Items Requested</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      ${itemRows(items)}
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px">Subtotal (ex-VAT)</td>
        <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${gbp(quote.subtotal_gbp_pence)}</td>
      </tr>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <p style="color:#475569;font-size:13px;margin:0 0 16px;line-height:1.5">
        Use the button below to return to your quote at any time &mdash; to amend it or accept and place your order.
      </p>
      <a href="${magicUrl}"
         style="display:inline-block;background:#1886a1;color:#fff;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px">
        View &amp; Manage Your Quote &rarr;
      </a>
      <p style="color:#94a3b8;font-size:11px;margin:12px 0 0">This link is personal to you and expires after 90&nbsp;days.</p>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-bottom:24px">
      <p style="color:#1e40af;font-size:12px;margin:0;line-height:1.6">
        <strong>All prices are ex-VAT.</strong> VAT applied on invoice based on your registration status.
        Hardware invoiced 100% prior to shipment. DAP delivery terms.
      </p>
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

  try {
    const [customerRes, ajsRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: recipients(quote.contact_email),
        subject: `Your Redzone quote ${quote.ref}`,
        html: customerHtml(quote, items, magicUrl),
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

// ─── Order confirmation emails (FR-22 / FR-23) ───────────────────────────────

interface OrderQuoteRow extends EmailQuoteRow {
  contact_phone: string | null;
  required_date: string | null;
  install_requested: boolean;
}

function orderConfirmationHtml(quote: OrderQuoteRow, items: EmailItemRow[]): string {
  const first = quote.contact_name.trim().split(" ")[0] ?? "there";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:linear-gradient(135deg,#05618e,#1886a1);border-radius:12px 12px 0 0;padding:24px 32px">
    <div style="color:rgba(255,255,255,0.7);font-size:11px;text-transform:uppercase;letter-spacing:2px">Order Confirmed</div>
    <div style="color:#fff;font-size:26px;font-weight:900;margin-top:4px">${quote.ref}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e6ebed;border-top:none">
    <p style="color:#1e293b;font-size:15px;margin:0 0 12px">Hi ${first},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 20px;line-height:1.6">
      Thank you &mdash; your order <strong>${quote.ref}</strong> has been confirmed.
      An invoice will be issued within 24 hours, payable 100% prior to shipment.
      Delivery is on DAP terms.
    </p>

    <h2 style="color:#03415f;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Items Ordered</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      ${itemRows(items)}
      <tr style="border-top:2px solid #e6ebed">
        <td colspan="2" style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px">Total (ex-VAT)</td>
        <td style="padding:10px 0;font-weight:bold;color:#1e293b;font-size:14px;text-align:right;white-space:nowrap">${gbp(quote.subtotal_gbp_pence)}</td>
      </tr>
    </table>

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
    : "Not specified";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#05618e;font-size:20px;margin:0 0 4px">Work order: ${quote.ref}</h1>
  <p style="color:#64748b;font-size:13px;margin:0 0 20px">Order confirmed — please begin production.</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:6px 0;font-size:13px;width:160px;color:#64748b">Customer</td>
        <td style="padding:6px 0;font-size:13px;font-weight:bold">${quote.contact_name}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Company</td>
        <td style="padding:6px 0;font-size:13px">${quote.contact_company ?? "&mdash;"}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Required by</td>
        <td style="padding:6px 0;font-size:13px;font-weight:bold">${requiredDate}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b">Total (ex-VAT)</td>
        <td style="padding:6px 0;font-size:14px;font-weight:bold;color:#1886a1">${gbp(quote.subtotal_gbp_pence)}</td></tr>
    ${quote.install_requested ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748b">Installation</td><td style="padding:6px 0;font-size:13px;color:#b45309;font-weight:bold">Requested &mdash; see portal for details</td></tr>` : ""}
  </table>

  <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 8px">Items</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">
    ${itemRows(items)}
  </table>
  <p style="font-size:12px;color:#94a3b8;margin:0">Submitted via AJS Redzone Portal.</p>
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

  // FR-23: work order goes to rz@ (add Gareth/Mick emails to WORK_ORDER_EMAILS env var when known)
  const workOrderRecipients = process.env.WORK_ORDER_EMAILS
    ? process.env.WORK_ORDER_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
    : [AJS_NOTIFY];

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const [customerRes, workOrderRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: recipients(quote.contact_email),
        subject: `Order confirmed: ${quote.ref} — AJS Redzone`,
        html: orderConfirmationHtml(quote, items),
      }),
      resend.emails.send({
        from: FROM,
        to: recipients(...workOrderRecipients),
        subject: `Work order: ${quote.ref} — ${quote.contact_company ?? quote.contact_name}`,
        html: workOrderHtml(quote, items),
      }),
    ]);
    if (customerRes.error) console.error("[email] order confirmation failed:", customerRes.error);
    if (workOrderRes.error) console.error("[email] work order failed:", workOrderRes.error);
  } catch (err) {
    console.error("[email] order confirmation unexpected error:", err);
  }
}
