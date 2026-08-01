import PageHeader from "@/components/PageHeader";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Account — Quoter Admin" };

export default async function AdminAccountPage() {
  const user = await getUser();
  const supabase = await createClient();

  // Fleet-wide tallies (admins can read all).
  const [{ count: rooferCount }, { count: liveCount }, { count: leadCount }] =
    await Promise.all([
      supabase.from("roofers").select("id", { count: "exact", head: true }),
      supabase
        .from("roofers")
        .select("id", { count: "exact", head: true })
        .eq("deploy_status", "live"),
      supabase.from("leads").select("id", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Roofers", value: rooferCount ?? 0 },
    { label: "Live", value: liveCount ?? 0 },
    { label: "Leads (all-time)", value: leadCount ?? 0 },
  ];

  return (
    <div>
      <PageHeader title="Account" subtitle="Your operator profile" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="surface rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {s.label}
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="surface max-w-md rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Signed in as</h2>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-ink to-black text-base font-semibold text-white">
            {user?.email?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.email}
            </p>
            <p className="text-xs text-muted">Quoter operator</p>
          </div>
        </div>
      </div>
    </div>
  );
}
