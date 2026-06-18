"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

export interface PMActionState {
  success?: boolean;
  error?: string;
}

export async function savePMPhoneAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const id = ((formData.get("pm_id") as string) ?? "").trim();
  const phone = ((formData.get("phone") as string) ?? "").trim() || null;

  if (!id) return { error: "Missing PM id" };

  const supabase = getServiceClient();
  const { error } = await supabase.from("rz_pms").update({ phone }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/redzone-pms");
  return { success: true };
}

export async function invitePMAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const phone = ((formData.get("phone") as string) ?? "").trim() || null;
  const type = (formData.get("type") as string) ?? "pm";

  if (!name) return { error: "Name is required" };
  if (!email) return { error: "Email is required" };
  if (type !== "pm" && type !== "admin") return { error: "Invalid type" };

  const supabase = getServiceClient();

  if (type === "pm") {
    const { data: existing } = await supabase.from("rz_pms").select("id").eq("email", email).maybeSingle();
    if (existing) return { error: "A PM with this email already exists" };
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/redzone/login`,
  });
  if (inviteError) return { error: inviteError.message };

  if (inviteData?.user) {
    const role = type === "admin" ? "rz_admin" : "rz_pm";
    await supabase.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: { role },
    });

    if (type === "pm") {
      const { error: insertError } = await supabase.from("rz_pms").insert({
        name,
        email,
        phone,
        auth_user_id: inviteData.user.id,
      });
      if (insertError) return { error: insertError.message };
    }
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

export async function removeAdminAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const userId = (formData.get("user_id") as string) ?? "";
  if (!userId) return { error: "Missing user id" };

  const supabase = getServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/redzone-pms");
  return { success: true };
}
