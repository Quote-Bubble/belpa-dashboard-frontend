"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { DeployStatus } from "@/lib/types";

/** company name → url-safe slug base. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Provision a roofer: insert the row with an auto-generated unique slug. All
 * writes are gated by is_admin() both here and in RLS.
 */
export async function createRoofer(formData: FormData) {
  if (!(await isAdmin())) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const website = String(formData.get("website") ?? "").trim() || null;
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const contactPhone =
    String(formData.get("contact_phone") ?? "").trim() || null;

  const supabase = await createClient();

  // Unique slug: base, then base-2, base-3, … (admin RLS lets us see all rows).
  const base = slugify(name) || "roofer";
  let slug = base;
  for (let n = 2; n < 200; n++) {
    const { data } = await supabase
      .from("roofers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }

  const { data: row, error } = await supabase
    .from("roofers")
    .insert({
      name,
      slug,
      website,
      contact_name: contactName,
      contact_phone: contactPhone,
    })
    .select("id")
    .single();

  if (error || !row) return;

  revalidatePath("/admin");
  redirect(`/admin/${row.id}`);
}

/** Move a roofer along the deploy pipeline (prospect → sent → live). */
export async function setDeployStatus(id: string, status: DeployStatus) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase
    .from("roofers")
    .update({ deploy_status: status })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

/**
 * Delete a roofer. Cascades to their members, pricing and leads (FK on delete
 * cascade), so this is destructive — the UI confirms first.
 */
export async function deleteRoofer(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("roofers").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Edit a roofer's identity + contact details. */
export async function updateRoofer(id: string, formData: FormData) {
  if (!(await isAdmin())) return;
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  await supabase
    .from("roofers")
    .update({
      ...(name ? { name } : {}),
      website: String(formData.get("website") ?? "").trim() || null,
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}
