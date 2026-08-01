import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import AddRooferForm from "@/components/admin/AddRooferForm";
import DeployBadge from "@/components/admin/DeployBadge";
import { createClient } from "@/lib/supabase/server";
import type { RooferAdminRow } from "@/lib/types";

export const metadata = { title: "Roofers — Quoter Admin" };

export default async function AdminFleetPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("roofers")
    .select(
      "id,slug,name,website,contact_name,contact_phone,deploy_status,created_at",
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as RooferAdminRow[];

  // Lead tally per roofer (admins can read all leads).
  const { data: leadRows } = await supabase.from("leads").select("roofer_id");
  const counts = new Map<string, number>();
  (leadRows ?? []).forEach((l) => {
    const rid = (l as { roofer_id: string }).roofer_id;
    counts.set(rid, (counts.get(rid) ?? 0) + 1);
  });

  return (
    <div>
      <PageHeader
        title="Roofers"
        subtitle={`${rows.length} on Quoter · manage deployment`}
      />

      {/* Provision */}
      <div className="surface mb-6 rounded-2xl p-5">
        <p className="mb-3 text-sm font-semibold text-ink">Add a roofer</p>
        <AddRooferForm />
      </div>

      {/* Fleet */}
      <div className="surface overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Roofer</th>
                <th className="px-5 py-3 font-semibold">Website</th>
                <th className="px-5 py-3 font-semibold">Deploy</th>
                <th className="px-5 py-3 text-right font-semibold">Leads</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="group border-b border-line/70 last:border-0 hover:bg-black/[0.02]"
                >
                  <td className="px-5 py-3">
                    <Link href={`/admin/${r.id}`} className="block">
                      <span className="font-semibold text-ink group-hover:text-brand-700">
                        {r.name}
                      </span>
                      <span className="block font-mono text-xs text-muted">
                        /{r.slug}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {r.website ? (
                      <span className="truncate">
                        {r.website.replace(/^https?:\/\//, "")}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <DeployBadge status={r.deploy_status} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-soft">
                    {counts.get(r.id) ?? 0}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-muted"
                  >
                    No roofers yet — add your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
