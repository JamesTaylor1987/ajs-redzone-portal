"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { sendStatusUpdateEmail } from "@/lib/email";
import { updateDataverseOpportunity } from "@/lib/dataverse";

const VALID_STATUSES = [
  "quote_submitted",
  "order_confirmed",
  "in_build",
  "ready_to_ship",
  "shipped",
  "complete",
  "cancelled",
  "expired",
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
  const cancellationReason = (formData.get("cancellation_reason") as string | null)?.trim() || null;

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
      ...(cancellationReason !== null && { cancellation_reason: cancellationReason }),
    })
    .eq("id", id);

  if (error) return { error: "Failed to update — please try again" };

  // Fetch quote + assigned PM for notifications
  const { data: quote } = await supabase
    .from("quotes")
    .select("ref, contact_name, contact_email, rz_pm_id, dataverse_opportunity_id")
    .eq("id", id)
    .single();

  if (quote) {
    let rzPmEmail: string | undefined;
    if (quote.rz_pm_id) {
      const { data: pm } = await supabase
        .from("rz_pms")
        .select("email")
        .eq("id", quote.rz_pm_id)
        .single();
      rzPmEmail = pm?.email ?? undefined;
    }

    await Promise.all([
      sendStatusUpdateEmail(
        quote.contact_name,
        quote.contact_email,
        quote.ref,
        status,
        trackingRef ?? undefined,
        trackingUrl ?? undefined,
        rzPmEmail,
        cancellationReason ?? undefined,
      ),
      updateDataverseOpportunity(quote.dataverse_opportunity_id ?? "", status),
    ]);
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");

  return { success: true };
}

export interface AssignPMState {
  success?: boolean;
  error?: string;
}

export async function assignPMAction(
  _prev: AssignPMState,
  formData: FormData,
): Promise<AssignPMState> {
  const id = (formData.get("id") as string) ?? "";
  const rzPmId = ((formData.get("rz_pm_id") as string) ?? "").trim() || null;

  if (!id) return { error: "Missing order id" };

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("quotes")
    .update({ rz_pm_id: rzPmId })
    .eq("id", id);

  if (error) return { error: "Failed to save — please try again" };

  revalidatePath(`/admin/orders/${id}`);
  return { success: true };
}
