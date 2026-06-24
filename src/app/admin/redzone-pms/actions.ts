"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

const APP_URL = "https://redzone.ajsspalding.co.uk";

export interface PMActionState {
  success?: boolean;
  error?: string;
  link?: string;
}

export async function invitePMAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const type = (formData.get("type") as string) ?? "pm";

  if (!name) return { error: "Name is required" };
  if (!email) return { error: "Email is required" };
  if (type !== "pm" && type !== "admin") return { error: "Invalid type" };

  const supabase = getServiceClient();

  if (type === "pm") {
    const { data: existing } = await supabase.from("rz_pms").select("id").eq("email", email).maybeSingle();
    if (existing) return { error: "A PM with this email already exists" };
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: name },
      redirectTo: `${APP_URL}/redzone/login`,
    },
  });
  if (inviteError) return { error: inviteError.message };

  const role = type === "admin" ? "rz_admin" : "rz_pm";
  await supabase.auth.admin.updateUserById(inviteData.user.id, {
    app_metadata: { role },
  });

  if (type === "pm") {
    const { error: insertError } = await supabase.from("rz_pms").insert({
      name,
      email,
      auth_user_id: inviteData.user.id,
    });
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/admin/redzone-pms");
  return { success: true, link: inviteData.properties.action_link };
}

export async function generateRZResetLinkAction(
  _prev: PMActionState,
  formData: FormData,
): Promise<PMActionState> {
  const email = (formData.get("email") as string) ?? "";
  if (!email) return { error: "Missing email" };

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}/redzone/login` },
  });

  if (error) return { error: error.message };
  return { success: true, link: data.properties.action_link };
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
