"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

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

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return;
  }

  const supabase = getServiceClient();
  await supabase.from("quotes").update({ status }).eq("id", id);

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}
