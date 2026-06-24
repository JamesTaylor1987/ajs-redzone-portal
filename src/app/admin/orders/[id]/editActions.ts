"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { buildMagicUrl } from "@/lib/magic-link";
import { Resend } from "resend";

const FROM = "AJS Spalding <quotes@ajsspalding.co.uk>";

function recipients(email: string): string[] {
  return process.env.NODE_ENV === "production" ? [email] : ["james@ajsspalding.co.uk"];
}

function gbpFmt(pence: number) {
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface EditItem {
  sku: string;
  name: string;
  qty: number;
  unit_price_pence: number;
  discount_pct: number; // 0–100
}

export interface QuoteAdjustments {
  overallDiscountPct: number | null; // null = no overall discount
  shippingLabel: string | null;      // null = default "Shipping"
  shippingPence: number | null;      // null = keep original / EXW
}

export async function saveQuoteAction(
  quoteId: string,
  items: EditItem[],
  adj: QuoteAdjustments,
): Promise<{ error?: string }> {
  const supabase = getServiceClient();

  // Replace all items
  const { error: delError } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
  if (delError) return { error: delError.message };

  if (items.length > 0) {
    const toInsert = items.map((item) => {
      const lineTotal = Math.round(item.unit_price_pence * item.qty * (1 - (item.discount_pct || 0) / 100));
      return {
        quote_id: quoteId,
        sku: item.sku || "CUSTOM",
        name: item.name,
        qty: item.qty,
        unit_price_gbp_pence: item.unit_price_pence,
        line_total_gbp_pence: lineTotal,
        discount_pct: item.discount_pct || 0,
      };
    });

    const { error: insError } = await supabase.from("quote_items").insert(toInsert);
    if (insError) return { error: insError.message };

    const subtotal = toInsert.reduce((s, i) => s + i.line_total_gbp_pence, 0);

    await supabase.from("quotes").update({
      subtotal_gbp_pence:    subtotal,
      overall_discount_pct:  adj.overallDiscountPct ?? null,
      shipping_override_pence: adj.shippingPence !== null ? adj.shippingPence : null,
      shipping_label:        adj.shippingLabel || null,
      amended_at:            new Date().toISOString(),
    }).eq("id", quoteId);
  }

  revalidatePath(`/admin/orders/${quoteId}`);
  return {};
}

export async function resendAmendedQuoteAction(
  quoteId: string,
): Promise<{ error?: string }> {
  if (!process.env.RESEND_API_KEY) return { error: "Email not configured" };

  const supabase = getServiceClient();

  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  if (!quote) return { error: "Quote not found" };

  const { data: items } = await supabase
    .from("quote_items")
    .select("sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence, discount_pct")
    .eq("quote_id", quoteId);

  const magicUrl = buildMagicUrl(quote.ref, quote.magic_token);

  const itemRows = (items ?? []).map((i) => {
    const disc = Number(i.discount_pct || 0);
    const discCell = disc > 0
      ? `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#059669;font-size:12px">${disc}% off</td>`
      : `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb"></td>`;
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;font-weight:bold">${i.sku}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${i.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${gbpFmt(Number(i.unit_price_gbp_pence))}</td>
      ${discCell}
      <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold">${gbpFmt(Number(i.line_total_gbp_pence))}</td>
    </tr>`;
  }).join("");

  const subtotal = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);
  const overallDisc = Number(quote.overall_discount_pct || 0);
  const discountedSubtotal = Math.round(subtotal * (1 - overallDisc / 100));
  const shippingPence = quote.shipping_override_pence != null
    ? Number(quote.shipping_override_pence)
    : (quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null);
  const shippingLabel = (quote.shipping_label as string | null) || "Shipping";
  const grandTotal = discountedSubtotal + (shippingPence ?? 0);

  const overallDiscRow = overallDisc > 0 ? `
    <tr>
      <td colspan="5" style="padding:6px 12px;text-align:right;color:#64748b;font-size:13px">Overall discount (${overallDisc}%)</td>
      <td style="padding:6px 12px;text-align:right;color:#059669;font-weight:bold">−${gbpFmt(subtotal - discountedSubtotal)}</td>
    </tr>` : "";

  const shippingRow = shippingPence !== null ? `
    <tr>
      <td colspan="5" style="padding:6px 12px;text-align:right;color:#64748b;font-size:13px">${shippingLabel}</td>
      <td style="padding:6px 12px;text-align:right;font-weight:bold">${gbpFmt(shippingPence)}</td>
    </tr>` : "";

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1886a1;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">Updated quote: ${quote.ref}</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#374151">Hi ${(quote.contact_name as string).trim().split(" ")[0]},</p>
      <p style="margin:0 0 24px;color:#374151">We've updated your quote — please see the revised breakdown below.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">SKU</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Product</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">Unit</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b">Disc.</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="padding:8px 12px;text-align:right;color:#64748b;font-size:13px">Subtotal (ex-VAT)</td>
            <td style="padding:8px 12px;text-align:right;font-weight:bold">${gbpFmt(subtotal)}</td>
          </tr>
          ${overallDiscRow}
          ${shippingRow}
          <tr style="border-top:2px solid #e5e7eb">
            <td colspan="5" style="padding:10px 12px;text-align:right;font-weight:bold;font-size:15px">Total (ex-VAT)</td>
            <td style="padding:10px 12px;text-align:right;font-weight:800;font-size:15px;color:#1886a1">${gbpFmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="text-align:center;margin:28px 0">
        <a href="${magicUrl}" style="display:inline-block;background:#1886a1;color:#fff;font-weight:bold;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px">
          View &amp; manage your quote &rarr;
        </a>
      </div>
      <p style="margin:24px 0 0;color:#64748b;font-size:13px">If you have any questions, don't hesitate to get in touch.</p>
    </div>
  </div>
</body></html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: recipients(quote.contact_email as string),
    subject: `Updated quote: ${quote.ref}`,
    html,
  });

  if (error) return { error: error.message };
  return {};
}
