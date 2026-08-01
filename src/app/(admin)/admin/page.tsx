import Link from "next/link";

import PageHeader from "@/components/PageHeader";
import AddRoofer from "@/components/admin/AddRoofer";
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
        subtitle={`${rows.length} on Quoter · ${
          rows.filter((r) => r.deploy_status === "live").length
        } live`}
      />

      <AddRoofer />

      <div className="surface overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted">
            No roofers yet — add your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {rows.map((r) => {
              const leads = counts.get(r.id) ?? 0;
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/${r.id}`}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02] sm:gap-4 sm:px-5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-sm font-semibold text-white">
                      {r.name.charAt(0).toUpperCase()}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink group-hover:text-brand-700">
                        {r.name}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted">
                        /{r.slug}
                      </span>
                    </span>

                    <span className="hidden max-w-[200px] truncate text-sm text-ink-soft lg:block">
                      {r.website ? (
                        r.website.replace(/^https?:\/\//, "")
                      ) : (
                        <span className="text-muted">no site</span>
                      )}
                    </span>

                    <DeployBadge status={r.deploy_status} />

                    <span className="w-20 shrink-0 text-right text-sm text-ink-soft">
                      <span className="font-semibold tabular-nums text-ink">
                        {leads}
                      </span>{" "}
                      <span className="hidden text-xs text-muted sm:inline">
                        lead{leads === 1 ? "" : "s"}
                      </span>
                    </span>

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-line transition-colors group-hover:text-muted"
                      aria-hidden
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
