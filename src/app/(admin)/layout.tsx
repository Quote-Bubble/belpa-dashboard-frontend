import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Standalone operator area — its own shell (not the roofer dashboard). Guarded
 * twice over: a session is required, and the user must be an admin. Non-admins
 * are sent to their roofer dashboard.
 */
export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin())) redirect("/quotes");

  return <AdminShell email={user.email ?? null}>{children}</AdminShell>;
}
