import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getRoofer } from "@/lib/roofer";
import { isAdmin } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";

/** Guarded shell: only reachable with a session (middleware also enforces this). */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const lookup = await getRoofer();
  const roofer = lookup.status === "ok" ? lookup.roofer : null;
  const admin = await isAdmin();

  return (
    <DashboardShell
      userEmail={user.email ?? null}
      roofer={roofer}
      isAdmin={admin}
    >
      {children}
    </DashboardShell>
  );
}
