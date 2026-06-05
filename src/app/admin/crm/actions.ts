"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";

export async function createProspectAction(formData: FormData) {
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  const { data: prospect, error } = await supabase
    .from("crm_prospects")
    .insert({
      company_name: g("company_name"),
      industry: g("industry") || null,
      website: g("website") || null,
      stage: g("stage") || "prospect",
      owner_name: g("owner_name") || "Noah",
      notes: g("notes") || null,
    })
    .select("id")
    .single();

  if (error || !prospect) return;

  const contactName = g("contact_name");
  if (contactName) {
    await supabase.from("crm_contacts").insert({
      prospect_id: prospect.id,
      name: contactName,
      role: g("contact_role") || null,
      phone: g("contact_phone") || null,
      email: g("contact_email") || null,
    });
  }

  redirect(`/admin/crm/${prospect.id}`);
}

export async function updateProspectDetailsAction(formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  await supabase.from("crm_prospects").update({
    company_name: g("company_name"),
    industry: g("industry") || null,
    website: g("website") || null,
    owner_name: g("owner_name") || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
}

export async function updateProspectNotesAction(formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  await supabase.from("crm_prospects").update({
    notes: g("notes") || null,
    next_action: g("next_action") || null,
    next_action_date: g("next_action_date") || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/crm/${id}`);
}

export async function updateStageAction(formData: FormData) {
  const id = formData.get("id") as string;
  const stage = formData.get("stage") as string;
  const supabase = getServiceClient();

  await supabase.from("crm_prospects")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
}

export async function logActivityAction(formData: FormData) {
  const prospect_id = formData.get("prospect_id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  await supabase.from("crm_activities").insert({
    prospect_id,
    type: g("type") || "coffee",
    notes: g("notes"),
    occurred_at: g("occurred_at") || new Date().toISOString(),
  });

  await supabase.from("crm_prospects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", prospect_id);

  revalidatePath(`/admin/crm/${prospect_id}`);
}

export async function addContactAction(formData: FormData) {
  const prospect_id = formData.get("prospect_id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  await supabase.from("crm_contacts").insert({
    prospect_id,
    name: g("name"),
    role: g("role") || null,
    email: g("email") || null,
    phone: g("phone") || null,
    notes: g("notes") || null,
  });

  revalidatePath(`/admin/crm/${prospect_id}`);
}

export async function deleteActivityAction(formData: FormData) {
  const id = formData.get("id") as string;
  const prospect_id = formData.get("prospect_id") as string;
  const supabase = getServiceClient();

  await supabase.from("crm_activities").delete().eq("id", id);

  revalidatePath(`/admin/crm/${prospect_id}`);
}

export async function deleteContactAction(formData: FormData) {
  const id = formData.get("id") as string;
  const prospect_id = formData.get("prospect_id") as string;
  const supabase = getServiceClient();

  await supabase.from("crm_contacts").delete().eq("id", id);

  revalidatePath(`/admin/crm/${prospect_id}`);
}

export async function deleteProspectAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = getServiceClient();

  await supabase.from("crm_prospects").delete().eq("id", id);

  redirect("/admin/crm");
}
