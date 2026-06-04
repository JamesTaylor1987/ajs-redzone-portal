"use server";

import { redirect } from "next/navigation";
import { getAuthClient } from "@/lib/supabase-auth";

export async function rzLoginAction(formData: FormData) {
  const email = (formData.get("email") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";

  const supabase = getAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/redzone/login?error=${encodeURIComponent(error.message)}`);
  }

  const role = (data.user?.app_metadata?.role as string) ?? "";
  if (role !== "rz_pm" && role !== "rz_admin") {
    await supabase.auth.signOut();
    redirect(`/redzone/login?error=${encodeURIComponent("Access denied — Redzone accounts only.")}`);
  }

  redirect("/redzone/quotes");
}

export async function rzLogoutAction() {
  const supabase = getAuthClient();
  await supabase.auth.signOut();
  redirect("/redzone/login");
}
