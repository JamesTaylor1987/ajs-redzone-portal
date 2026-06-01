"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";
import { verificationHash } from "@/lib/magic-link";

export async function verifyEmailAction(formData: FormData) {
  const quoteRef = (formData.get("quoteRef") as string) ?? "";
  const token = (formData.get("token") as string) ?? "";
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();

  const encodedRef = encodeURIComponent(quoteRef);
  const base = `/quote/${encodedRef}/edit?token=${token}`;

  if (!email) {
    redirect(`${base}&err=email`);
  }

  const supabase = getServiceClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, contact_email, magic_token, magic_expires_at")
    .eq("ref", quoteRef)
    .single();

  if (!quote || quote.magic_token !== token) {
    redirect(`${base}&err=invalid`);
  }

  if (quote.magic_expires_at && new Date(quote.magic_expires_at) < new Date()) {
    redirect(`${base}&err=expired`);
  }

  if (quote.contact_email.toLowerCase() !== email) {
    redirect(`${base}&err=email`);
  }

  const hash = verificationHash(token, email);
  cookies().set(`rz_v_${quote.id.slice(0, 8)}`, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  redirect(base);
}
