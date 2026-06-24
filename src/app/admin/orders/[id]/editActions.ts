"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { buildMagicUrl } from "@/lib/magic-link";
import { Resend } from "resend";
const FROM = "AJS Spalding <quotes@ajsspalding.co.uk>";

function recipients(email: string): string[] {
  return process.env.NODE_ENV === "production" ? [email] : ["james@ajsspalding.co.uk"];
}

function gbpEmail(pence: number) {
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface EditItem {
  sku: string;
  name: string;
  qty: number;
  unit_price_pence: number;
}

export async function saveQuoteItemsAction(
  quoteId: string,
  items: EditItem[],
): Promise<{ error?: string }> {
  const supabase = getServiceClient();

  const { error: delError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);
  if (delError) return { error: delError.message };

  if (items.length > 0) {
    const toInsert = items.map((item) => ({
      quote_id: quoteId,
      sku: item.sku || "CUSTOM",
      name: item.name,
      qty: item.qty,
      unit_price_gbp_pence: item.unit_price_pence,
      line_total_gbp_pence: item.unit_price_pence * item.qty,
    }));

    const { error: insError } = await supabase.from("quote_items").insert(toInsert);
    if (insError) return { error: insError.message };

    const subtotal = toInsert.reduce((s, i) => s + i.line_total_gbp_pence, 0);
    await supabase
      .from("quotes")
      .update({ subtotal_gbp_pence: subtotal, amended_at: new Date().toISOString() })
      .eq("id", quoteId);
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
    .select("sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence")
    .eq("quote_id", quoteId);

  const magicUrl = buildMagicUrl(quote.ref, quote.magic_token);
  const itemRows = (items ?? [])
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;font-weight:bold">${i.sku}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${i.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${gbpEmail(Number(i.unit_price_gbp_pence))}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold">${gbpEmail(Number(i.line_total_gbp_pence))}</td>
        </tr>`,
    )
    .join("");

  const subtotal = (items ?? []).reduce((s, i) => s + Number(i.line_total_gbp_pence), 0);

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1886a1;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">Updated quote: ${quote.ref}</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#374151">Hi ${quote.contact_name.trim().split(" ")[0]},</p>
      <p style="margin:0 0 24px;color:#374151">We've updated your quote — please see the revised breakdown below.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">SKU</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Product</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Unit</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding:10px 12px;text-align:right;color:#64748b;font-size:13px">Subtotal (ex-VAT)</td>
            <td style="padding:10px 12px;text-align:right;font-weight:bold">${gbpEmail(subtotal)}</td>
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
    to: recipients(quote.contact_email),
    subject: `Updated quote: ${quote.ref}`,
    html,
  });

  if (error) return { error: error.message };
  return {};
}
