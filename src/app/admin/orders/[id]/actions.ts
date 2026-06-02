"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { sendStatusUpdateEmail } from "@/lib/email";

const VALID_STATUSES = [
  "quote_submitted",
  "order_confirmed",
  "in_build",
  "ready_to_ship",
  "shipped",
  "complete",
  "cancelled",
] as const;

export async function updateStatusAction(formData: FormData): Promise<void> {
  const id = (formData.get("id") as string) ?? "";
  const status = (formData.get("status") as string) ?? "";
  const trackingRef = (formData.get("tracking_ref") as string | null)?.trim() || undefined;

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) return;

  const supabase = getServiceClient();

  await supabase.from("quotes").update({ status }).eq("id", id);

  // Fire status email — fetch quote for contact details
  const { data: quote } = await supabase
    .from("quotes")
    .select("ref, contact_name, contact_email")
    .eq("id", id)
    .single();

  if (quote) {
    await sendStatusUpdateEmail(
      quote.contact_name,
      quote.contact_email,
      quote.ref,
      status,
      trackingRef,
    );
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}
