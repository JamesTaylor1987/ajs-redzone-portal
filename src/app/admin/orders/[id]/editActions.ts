"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { buildMagicUrl } from "@/lib/magic-link";
import { sendAmendedQuoteEmail } from "@/lib/email";

export interface EditItem {
  sku: string;
  name: string;
  qty: number;
  unit_price_pence: number;
  discount_pct: number;
}

export interface QuoteAdjustments {
  overallDiscountPct: number | null;
  shippingLabel: string | null;
  shippingPence: number | null;
}

export async function saveQuoteAction(
  quoteId: string,
  items: EditItem[],
  adj: QuoteAdjustments,
): Promise<{ error?: string }> {
  const supabase = getServiceClient();

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
      subtotal_gbp_pence:      subtotal,
      overall_discount_pct:    adj.overallDiscountPct ?? null,
      shipping_override_pence: adj.shippingPence !== null ? adj.shippingPence : null,
      shipping_label:          adj.shippingLabel || null,
      amended_at:              new Date().toISOString(),
    }).eq("id", quoteId);
  }

  revalidatePath(`/admin/orders/${quoteId}`);
  return {};
}

export async function resendAmendedQuoteAction(
  quoteId: string,
): Promise<{ error?: string }> {
  const supabase = getServiceClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (!quote) return { error: "Quote not found" };

  const { data: items } = await supabase
    .from("quote_items")
    .select("sku, name, qty, unit_price_gbp_pence, line_total_gbp_pence, discount_pct")
    .eq("quote_id", quoteId);

  const nextRevision = (Number(quote.revision ?? 0)) + 1;

  const magicUrl = buildMagicUrl(quote.ref, quote.magic_token);

  const result = await sendAmendedQuoteEmail(
    {
      ref: quote.ref,
      contact_name: quote.contact_name as string,
      contact_email: quote.contact_email as string,
      contact_company: (quote.contact_company as string | null) ?? null,
      shipping_gbp_pence: quote.shipping_gbp_pence != null ? Number(quote.shipping_gbp_pence) : null,
      shipping_override_pence: quote.shipping_override_pence != null ? Number(quote.shipping_override_pence) : null,
      shipping_label: (quote.shipping_label as string | null) ?? null,
      shipping_pallets: quote.shipping_pallets != null ? Number(quote.shipping_pallets) : null,
      overall_discount_pct: quote.overall_discount_pct != null ? Number(quote.overall_discount_pct) : null,
      currency: (quote.currency as string | null) ?? null,
      fx_rate_used: quote.fx_rate_used != null ? Number(quote.fx_rate_used) : null,
      locale: (quote.locale as string | null) ?? null,
      revision: nextRevision,
    },
    (items ?? []).map((i) => ({
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      unit_price_gbp_pence: Number(i.unit_price_gbp_pence),
      line_total_gbp_pence: Number(i.line_total_gbp_pence),
      discount_pct: Number(i.discount_pct ?? 0),
    })),
    magicUrl,
  );

  if (result.error) return { error: result.error };

  await supabase.from("quotes").update({
    revision: nextRevision,
    amended_at: new Date().toISOString(),
  }).eq("id", quoteId);

  revalidatePath(`/admin/orders/${quoteId}`);
  return {};
}
