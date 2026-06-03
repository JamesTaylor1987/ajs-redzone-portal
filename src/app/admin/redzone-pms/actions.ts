"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

export interface PMActionState {
  success?: boolean;
  error?: string;
}

export async function invitePMAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();

  if (!name) return { error: "Name is required" };
  if (!email) return { error: "Email is required" };

  const supabase = getServiceClient();

  // Check for duplicate
  const { data: existing } = await supabase.from("rz_pms").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "A PM with this email already exists" };

  // Invite via Supabase auth
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/redzone/login`,
  });
  if (inviteError) return { error: inviteError.message };

  // Set role in app_metadata
  if (inviteData?.user) {
    await supabase.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: { role: "rz_pm" },
    });

    // Insert into rz_pms
    const { error: insertError } = await supabase.from("rz_pms").insert({
      name,
      email,
      auth_user_id: inviteData.user.id,
    });
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/admin/redzone-pms");
  return { success: true };
}

export async function removePMAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const id = (formData.get("pm_id") as string) ?? "";
  if (!id) return { error: "Missing PM id" };

  const supabase = getServiceClient();

  const { data: pm } = await supabase.from("rz_pms").select("auth_user_id").eq("id", id).single();

  const { error } = await supabase.from("rz_pms").delete().eq("id", id);
  if (error) return { error: error.message };

  if (pm?.auth_user_id) {
    await supabase.auth.admin.deleteUser(pm.auth_user_id);
  }

  revalidatePath("/admin/redzone-pms");
  return { success: true };
}
