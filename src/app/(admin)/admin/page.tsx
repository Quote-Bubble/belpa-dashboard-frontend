import PageHeader from "@/components/PageHeader";
import AddRoofer from "@/components/admin/AddRoofer";
import RooferList from "@/components/admin/RooferList";
import Signups, { type Signup } from "@/components/admin/Signups";
import { createClient } from "@/lib/supabase/server";
import type { RooferAdminRow } from "@/lib/types";

export const metadata = { title: "Roofers — Belpa Admin" };

export default async function AdminFleetPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("roofers")
    .select(
      "id,slug,name,website,contact_name,contact_phone,deploy_status,created_at",
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as RooferAdminRow[];

  const { data: leadRows } = await supabase.from("leads").select("roofer_id");
  // Plain object rather than a Map: this crosses the server/client boundary to
  // RooferList, and a Map is not serialisable in an RSC payload.
  const counts: Record<string, number> = {};
  (leadRows ?? []).forEach((l) => {
    const rid = (l as { roofer_id: string }).roofer_id;
    counts[rid] = (counts[rid] ?? 0) + 1;
  });

  const { data: signupRows } = await supabase.rpc("admin_list_signups");
  const signups = (signupRows ?? []) as Signup[];

  return (
    <div>
      <PageHeader title="Roofers" />

      {/* Above the fleet, because it is a queue: it has to be seen on the way
          past, not found. It collapses to a single quiet line when empty, so
          it costs nothing on the days there is nothing to review. */}
      <Signups initial={signups} />

      <AddRoofer />

      <div className="surface overflow-hidden rounded-2xl">
        <RooferList rows={rows} counts={counts} />
      </div>
    </div>
  );
}
