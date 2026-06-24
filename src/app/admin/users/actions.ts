"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

const VALID_ROLES = ["admin", "manager", "standard"] as const;
const APP_URL = "https://redzone.ajsspalding.co.uk";

export interface UserActionState {
  success?: boolean;
  error?: string;
  link?: string;
}

export async function inviteUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const role = (formData.get("role") as string) ?? "standard";
  const name = ((formData.get("name") as string) ?? "").trim();

  if (!email) return { error: "Email is required" };
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) return { error: "Invalid role" };

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: name },
      redirectTo: `${APP_URL}/admin`,
    },
  });

  if (error) return { error: error.message };

  await supabase.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role },
  });

  revalidatePath("/admin/users");
  return { success: true, link: data.properties.action_link };
}

export async function generateResetLinkAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const email = (formData.get("email") as string) ?? "";
  if (!email) return { error: "Missing email" };

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}/admin` },
  });

  if (error) return { error: error.message };
  return { success: true, link: data.properties.action_link };
}

export async function updateRoleAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const userId = (formData.get("user_id") as string) ?? "";
  const role = (formData.get("role") as string) ?? "";

  if (!userId) return { error: "Missing user" };
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) return { error: "Invalid role" };

  const supabase = getServiceClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}

export async function removeUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const userId = (formData.get("user_id") as string) ?? "";
  if (!userId) return { error: "Missing user" };

  const supabase = getServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}
