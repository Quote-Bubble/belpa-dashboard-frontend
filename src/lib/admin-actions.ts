"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { fail, ok, type ActionResult } from "@/lib/action-result";
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

function revalidateRoofer(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

/**
 * Provision a roofer: insert the row with an auto-generated unique slug. All
 * writes are gated by is_admin() both here and in RLS.
 */
export async function createRoofer(formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Not authorized.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Company name is required.");
  const website = String(formData.get("website") ?? "").trim() || null;
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const contactPhone =
    String(formData.get("contact_phone") ?? "").trim() || null;

  const supabase = await createClient();

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

  if (error || !row) {
    return fail(error?.message ?? "Couldn’t create that roofer.");
  }

  revalidatePath("/admin");
  redirect(`/admin/${row.id}`);
}

/** Move a roofer along the deploy pipeline. */
export async function setDeployStatus(
  id: string,
  status: DeployStatus,
): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Not authorized.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("roofers")
    .update({ deploy_status: status })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidateRoofer(id);
  return ok(status === "live" ? "Marked live." : "Marked to set up.");
}

/**
 * Delete a roofer. Cascades to their members, pricing and leads.
 */
export async function deleteRoofer(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Not authorized.");
  const supabase = await createClient();
  const { error } = await supabase.from("roofers").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Link a roofer's login (by signup email) so they see their leads. */
export async function linkRooferLogin(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Not authorized.");
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return fail("Email is required.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_link_user_to_roofer", {
    p_roofer_id: id,
    p_email: email,
  });
  if (error) return fail(error.message);
  if (data === "not_found") {
    return fail(
      "No account with that email. Ask them to sign up first, then link again.",
    );
  }
  revalidatePath(`/admin/${id}`);
  return ok(`Linked ${email}.`);
}

/** Remove a linked login from a roofer. */
export async function unlinkRooferLogin(
  id: string,
  email: string,
): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Not authorized.");
  const tidy = email.trim();
  if (!tidy) return fail("Email is required.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_unlink_user_from_roofer", {
    p_roofer_id: id,
    p_email: tidy,
  });
  if (error) return fail(error.message);
  if (data === "not_found") return fail("No account with that email.");
  if (data === "not_linked") return fail("That login isn’t linked.");
  revalidatePath(`/admin/${id}`);
  return ok(`Unlinked ${tidy}.`);
}

/** Edit a roofer's identity + contact details. */
export async function updateRoofer(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Not authorized.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Company name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("roofers")
    .update({
      name,
      website: String(formData.get("website") ?? "").trim() || null,
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidateRoofer(id);
  return ok("Saved.");
}
