"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase-server";

// ── RZ Contacts ──────────────────────────────────────────────────────────────

export async function createRZContactAction(formData: FormData) {
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  const langs = formData.getAll("languages").filter((v): v is string => typeof v === "string");

  const { data: contact } = await supabase
    .from("crm_rz_contacts")
    .insert({
      name:        g("name"),
      role:        g("role")        || null,
      region:      g("region")      || null,
      country:     g("country")     || null,
      nationality: g("nationality") || null,
      languages:   langs.length > 0 ? langs : null,
      email:       g("email")       || null,
      phone:       g("phone")       || null,
      linkedin:    g("linkedin")    || null,
      notes:       g("notes")       || null,
    })
    .select("id")
    .single();

  if (!contact) return;
  redirect(`/admin/crm/contacts/${contact.id}`);
}

export async function updateRZContactAction(formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const langs = formData.getAll("languages").filter((v): v is string => typeof v === "string");
  const supabase = getServiceClient();

  await supabase.from("crm_rz_contacts").update({
    name:        g("name"),
    role:        g("role")        || null,
    region:      g("region")      || null,
    country:     g("country")     || null,
    nationality: g("nationality") || null,
    languages:   langs.length > 0 ? langs : null,
    email:       g("email")       || null,
    phone:       g("phone")       || null,
    linkedin:    g("linkedin")    || null,
    notes:       g("notes")       || null,
    updated_at:  new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/crm/contacts/${id}`);
  revalidatePath("/admin/crm/contacts");
  redirect(`/admin/crm/contacts/${id}`);
}

export async function deleteRZContactAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = getServiceClient();
  await supabase.from("crm_rz_contacts").delete().eq("id", id);
  redirect("/admin/crm/contacts");
}

export async function logRZActivityAction(formData: FormData) {
  const contact_id = formData.get("contact_id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  await supabase.from("crm_rz_activities").insert({
    contact_id,
    type:        g("type") || "coffee",
    notes:       g("notes"),
    occurred_at: g("occurred_at") || new Date().toISOString(),
  });

  await supabase.from("crm_rz_contacts")
    .update({
      follow_up_date: g("follow_up_date") || null,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", contact_id);

  revalidatePath(`/admin/crm/contacts/${contact_id}`);
  revalidatePath("/admin/crm/contacts");
}

export async function deleteRZActivityAction(formData: FormData) {
  const id = formData.get("id") as string;
  const contact_id = formData.get("contact_id") as string;
  const supabase = getServiceClient();
  await supabase.from("crm_rz_activities").delete().eq("id", id);
  revalidatePath(`/admin/crm/contacts/${contact_id}`);
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function createLeadAction(formData: FormData) {
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  const { data: lead } = await supabase
    .from("crm_leads")
    .insert({
      company_name:   g("company_name"),
      site_name:      g("site_name")      || null,
      rz_contact_id:  g("rz_contact_id")  || null,
      notes:          g("notes")          || null,
      follow_up_date: g("follow_up_date") || null,
      end_user_name:  g("end_user_name")  || null,
      end_user_phone: g("end_user_phone") || null,
      end_user_email: g("end_user_email") || null,
      status:         "new",
    })
    .select("id")
    .single();

  if (!lead) return;
  redirect(`/admin/crm/${lead.id}`);
}

export async function updateLeadAction(_prevState: unknown, formData: FormData) {
  const id = formData.get("id") as string;
  const g = (k: string) => (formData.get(k) as string ?? "").trim();
  const supabase = getServiceClient();

  await supabase.from("crm_leads").update({
    company_name:       g("company_name"),
    site_name:          g("site_name")          || null,
    rz_contact_id:      g("rz_contact_id")      || null,
    notes:              g("notes")               || null,
    follow_up_date:     g("follow_up_date")      || null,
    hardware_quote_ref: g("hardware_quote_ref")  || null,
    lost_reason:        g("lost_reason")         || null,
    end_user_name:      g("end_user_name")       || null,
    end_user_phone:     g("end_user_phone")      || null,
    end_user_email:     g("end_user_email")      || null,
    updated_at:         new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
  return { ok: true };
}

export async function updateLeadStatusAction(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const supabase = getServiceClient();

  await supabase.from("crm_leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath(`/admin/crm/${id}`);
  revalidatePath("/admin/crm");
}

export async function addFollowupAction(formData: FormData) {
  const leadId = formData.get("lead_id") as string;
  const note = ((formData.get("note") as string) ?? "").trim();
  if (!leadId || !note) return;
  const supabase = getServiceClient();
  await supabase.from("lead_followups").insert({ lead_id: leadId, note });
  revalidatePath(`/admin/crm/${leadId}`);
}

export async function deleteFollowupAction(formData: FormData) {
  const id = formData.get("id") as string;
  const leadId = formData.get("lead_id") as string;
  const supabase = getServiceClient();
  await supabase.from("lead_followups").delete().eq("id", id);
  revalidatePath(`/admin/crm/${leadId}`);
}

export async function deleteLeadAction(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = getServiceClient();
  await supabase.from("crm_leads").delete().eq("id", id);
  redirect("/admin/crm");
}
