"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-server";

const VALID_ROLES = ["admin", "manager", "standard"] as const;

export interface UserActionState {
  success?: boolean;
  error?: string;
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
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
  });

  if (error) return { error: error.message };

  // Set role in app_metadata after invite
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email === email);
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { role },
    });
  }

  revalidatePath("/admin/users");
  return { success: true };
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
