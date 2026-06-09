"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { sendStatusUpdateEmail } from "@/lib/email";

const MFG_STATUSES = ["in_build", "ready_to_ship", "shipped"] as const;

export interface StatusUpdateState {
  success?: boolean;
  error?: string;
}

export async function manufacturingUpdateStatusAction(
  _prev: StatusUpdateState,
  formData: FormData,
): Promise<StatusUpdateState> {
  const id = (formData.get("id") as string) ?? "";
  const status = (formData.get("status") as string) ?? "";
  const trackingRef = (formData.get("tracking_ref") as string | null)?.trim() || null;
  const trackingUrl = (formData.get("tracking_url") as string | null)?.trim() || null;

  if (!MFG_STATUSES.includes(status as (typeof MFG_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("quotes")
    .update({
      status,
      ...(trackingRef !== null && { tracking_ref: trackingRef }),
      ...(trackingUrl !== null && { tracking_url: trackingUrl }),
      ...(status === "shipped" && { shipped_at: now }),
    })
    .eq("id", id);

  if (error) return { error: "Failed to update status" };

  const { data: quote } = await supabase
    .from("quotes")
    .select("ref, contact_name, contact_email, locale")
    .eq("id", id)
    .single();

  if (quote) {
    await sendStatusUpdateEmail(
      quote.contact_name,
      quote.contact_email,
      quote.ref,
      status,
      trackingRef ?? undefined,
      trackingUrl ?? undefined,
      undefined,
      undefined,
      quote.locale,
    );
  }

  revalidatePath(`/manufacturing/orders/${id}`);
  revalidatePath("/manufacturing/orders");

  return { success: true };
}
