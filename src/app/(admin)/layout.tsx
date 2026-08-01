import { redirect } from "next/navigation";

import { createClient, getUser } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { count } = await supabase
    .from("roofers")
    .select("id", { count: "exact", head: true });

  return (
    <AdminShell email={user.email ?? null} rooferCount={count ?? 0}>
      {children}
    </AdminShell>
  );
}
