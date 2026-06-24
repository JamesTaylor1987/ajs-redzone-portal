"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";
import { sendStatusUpdateEmail, sendPMNotificationEmail } from "@/lib/email";
import { updateDataverseOpportunity, updateDataverseProbability } from "@/lib/dataverse";

const VALID_STATUSES = [
  "quote_submitted",
  "order_confirmed",
  "in_build",
  "invoiced",
  "payment_received",
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

  if (status === "expired") {
    const { data: current } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", id)
      .single();
    if (current?.status !== "quote_submitted") {
      return { error: "Only open (unconfirmed) quotes can be expired" };
    }
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("quotes")
    .update({
      status,
      ...(trackingRef !== null && { tracking_ref: trackingRef }),
      ...(trackingUrl !== null && { tracking_url: trackingUrl }),
      ...(cancellationReason !== null && { cancellation_reason: cancellationReason }),
      ...(status === "order_confirmed" && { confirmed_at: now }),
      ...(status === "shipped" && { shipped_at: now }),
      ...(status === "complete" && { completed_at: now }),
    })
    .eq("id", id);

  if (error) return { error: "Failed to update — please try again" };

  // Fetch quote + assigned PM for notifications
  const { data: quote } = await supabase
    .from("quotes")
    .select("ref, contact_name, contact_email, contact_company, site_name, rz_pm_id, dataverse_opportunity_id, locale")
    .eq("id", id)
    .single();

  if (quote) {
    const promises: Promise<unknown>[] = [
      sendStatusUpdateEmail(
        quote.contact_name,
        quote.contact_email,
        quote.ref,
        status,
        trackingRef ?? undefined,
        trackingUrl ?? undefined,
        undefined,
        cancellationReason ?? undefined,
        quote.locale,
      ),
      updateDataverseOpportunity(quote.dataverse_opportunity_id ?? "", status),
    ];

    if (quote.rz_pm_id) {
      const { data: pm } = await supabase
        .from("rz_pms")
        .select("email")
        .eq("id", quote.rz_pm_id)
        .single();
      if (pm?.email) {
        promises.push(sendPMNotificationEmail(
          pm.email,
          quote.ref,
          status,
          quote.contact_name,
          quote.contact_company ?? null,
          quote.site_name ?? null,
          trackingRef ?? undefined,
          trackingUrl ?? undefined,
        ));
      }
    }

    await Promise.all(promises);
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
  revalidatePath("/admin/orders");
  return { success: true };
}

export interface AdminNotesState {
  success?: boolean;
  error?: string;
}

export async function saveAdminNotesAction(
  _prev: AdminNotesState,
  formData: FormData,
): Promise<AdminNotesState> {
  const id = (formData.get("id") as string) ?? "";
  const adminNotes = ((formData.get("admin_notes") as string) ?? "").trim() || null;

  if (!id) return { error: "Missing order id" };

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("quotes")
    .update({ admin_notes: adminNotes })
    .eq("id", id);

  if (error) return { error: "Failed to save — please try again" };

  revalidatePath(`/admin/orders/${id}`);
  return { success: true };
}

export interface WinProbabilityState {
  success?: boolean;
  error?: string;
}

export async function updateWinProbabilityAction(
  _prev: WinProbabilityState,
  formData: FormData,
): Promise<WinProbabilityState> {
  const id = (formData.get("id") as string) ?? "";
  const raw = (formData.get("probability") as string) ?? "";

  if (!id) return { error: "Missing order id" };

  const probability = raw === "" ? null : parseInt(raw, 10);
  if (probability !== null && (isNaN(probability) || probability < 0 || probability > 100)) {
    return { error: "Probability must be 0–100" };
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("quotes")
    .update({ win_probability: probability, win_probability_set_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "Failed to save — please try again" };

  if (probability !== null) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("dataverse_opportunity_id")
      .eq("id", id)
      .single();
    if (quote?.dataverse_opportunity_id) {
      await updateDataverseProbability(quote.dataverse_opportunity_id, probability);
    }
  }

  revalidatePath(`/admin/orders/${id}`);
  return { success: true };
}
