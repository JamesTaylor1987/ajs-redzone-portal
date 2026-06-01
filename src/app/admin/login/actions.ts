"use server";

import { redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";

  const supabase = getAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/orders");
}

export async function logoutAction() {
  const supabase = getAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
