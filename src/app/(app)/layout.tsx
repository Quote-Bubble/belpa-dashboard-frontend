import { redirect } from "next/navigation";

import { createClient, getUser } from "@/lib/supabase/server";
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

  // Signup is open but onboarding is manual, so a session is not permission.
  // is_approved() is the gate the admin console's signup queue writes to.
  //
  // Enforced here rather than in proxy.ts on purpose: the proxy only refreshes
  // the session and would need its own database round trip on every request,
  // including static assets. This layout wraps every page that shows a
  // roofer's data and already awaits Supabase, so the check costs nothing
  // extra and cannot be skipped by reaching a page directly.
  const { data: approved } = await createClient().then((c) =>
    c.rpc("is_approved"),
  );
  if (!approved) redirect("/pending");

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
