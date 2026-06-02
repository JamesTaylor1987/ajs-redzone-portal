"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { sendStatusUpdateEmail } from "@/lib/email";

const MFG_STATUSES = ["in_build", "ready_to_ship", "shipped", "complete"] as const;

export async function manufacturingUpdateStatusAction(formData: FormData): Promise<void> {
  const id = (formData.get("id") as string) ?? "";
  const status = (formData.get("status") as string) ?? "";
  const trackingRef = (formData.get("tracking_ref") as string | null)?.trim() || undefined;

  if (!MFG_STATUSES.includes(status as (typeof MFG_STATUSES)[number])) return;

  const supabase = getServiceClient();
  await supabase.from("quotes").update({ status }).eq("id", id);

  const { data: quote } = await supabase
    .from("quotes")
    .select("ref, contact_name, contact_email")
    .eq("id", id)
    .single();

  if (quote) {
    await sendStatusUpdateEmail(quote.contact_name, quote.contact_email, quote.ref, status, trackingRef);
  }

  revalidatePath(`/manufacturing/orders/${id}`);
  revalidatePath("/manufacturing/orders");
}
