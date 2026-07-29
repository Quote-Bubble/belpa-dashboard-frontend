"use client";

import { formatMoney } from "@/lib/format";
import type { JobAggregateStats } from "@/lib/job-stats";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface rounded-2xl p-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-ink">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function JobStats({ stats }: { stats: JobAggregateStats }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Jobs completed" value={String(stats.jobsWon)} />
      <StatCard
        label="Total value"
        value={stats.pricedCount > 0 ? formatMoney(stats.totalValue) : "—"}
        hint="ex VAT"
      />
      <StatCard
        label="Avg job value"
        value={
          stats.avgJobValue != null ? formatMoney(stats.avgJobValue) : "—"
        }
        hint="ex VAT"
      />
      <StatCard
        label="Estimate accuracy"
        value={
          stats.accuracyWithinPct != null
            ? `within ${stats.accuracyWithinPct}%`
            : "—"
        }
        hint="of your actual prices"
      />
      <StatCard
        label="Conversion rate"
        value={
          stats.conversionRate != null
            ? `${Math.round(stats.conversionRate * 100)}%`
            : "—"
        }
        hint="won / all quotes"
      />
    </div>
  );
}
