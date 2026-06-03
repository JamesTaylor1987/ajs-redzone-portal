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

export interface StatusUpdateState {
  success?: boolean;
  error?: string;
}

export async function updateStatusAction(
  _prev: StatusUpdateState,
  formData: FormData,
): Promise<StatusUpdateState> {
  const id = (formData.get("id") as string) ?? "";
  const status = (formData.get("status") as string) ?? "";
  const trackingRef = (formData.get("tracking_ref") as string | null)?.trim() || null;
  const trackingUrl = (formData.get("tracking_url") as string | null)?.trim() || null;

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  const supabase = getServiceClient();

  const { error } = await supabase
    .from("quotes")
    .update({
      status,
      ...(trackingRef !== null && { tracking_ref: trackingRef }),
      ...(trackingUrl !== null && { tracking_url: trackingUrl }),
    })
    .eq("id", id);

  if (error) return { error: "Failed to update — please try again" };

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
      trackingRef ?? undefined,
      trackingUrl ?? undefined,
    );
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");

  return { success: true };
}
