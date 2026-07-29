"use client";

import { useMemo, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { useDashboardMode } from "@/components/DashboardModeProvider";
import LineChart, { type LinePoint } from "@/components/charts/LineChart";
import {
  formatMoney,
  jobTypeLabel,
  statusColor,
  statusLabel,
  STATUS_ORDER,
} from "@/lib/format";
import type { JobType, LeadStatus } from "@/lib/types";
import {
  buildDailyBuckets,
  dayKey,
  median,
  summariseDay,
  todayKey,
  yesterdayKey,
  type QuoteStat,
} from "@/lib/analytics";
import { estimateMidpoint } from "@/lib/job-stats";

const RANGE_OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

type StatusOrAll = "all" | LeadStatus;

const STATUS_FILTERS: { key: StatusOrAll; label: string }[] = [
  { key: "all", label: "All" },
  ...STATUS_ORDER.map((s) => ({ key: s, label: statusLabel(s) })),
];

function compactMoney(v: number): string {
  if (v >= 10_000) return `£${Math.round(v / 1000)}K`;
  if (v >= 1_000) return `£${(v / 1000).toFixed(1)}K`;
  return formatMoney(v);
}

function formatCount(v: number): string {
  return String(Math.round(v));
}

function formatPercent(v: number): string {
  return `${Math.round(v)}%`;
}

function StatCard({
  title,
  value,
  deltaLabel,
  data,
  formatValue,
}: {
  title: string;
  value: string;
  deltaLabel: string;
  data: LinePoint[];
  formatValue: (v: number) => string;
}) {
  return (
    <div className="surface rounded-2xl p-4">
      <p className="text-xs font-medium text-ink-soft">{title}</p>
      <p className="mt-0.5 text-xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-muted">{deltaLabel}</p>
      <div className="mt-3">
        <LineChart data={data} formatValue={formatValue} height={90} />
      </div>
    </div>
  );
}

/** A labelled row with a proportional bar — shared shape for the job-type and
 *  won-vs-lost breakdowns, so both compare magnitudes at a glance without
 *  needing a full chart each. */
function BarRow({
  label,
  count,
  value,
  pct,
  color,
}: {
  label: string;
  count: number;
  value: number | null;
  pct: number;
  color?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-ink-soft">
          {color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
          {label}
          <span className="text-muted">({count})</span>
        </span>
        <span className="font-medium tabular-nums text-ink">
          {value != null ? formatMoney(value) : "—"}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-black/[0.05]">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color ?? "var(--color-brand-500)",
          }}
        />
      </div>
    </div>
  );
}

function RangeSelect({
  rangeDays,
  onChange,
}: {
  rangeDays: (typeof RANGE_OPTIONS)[number]["days"];
  onChange: (days: (typeof RANGE_OPTIONS)[number]["days"]) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Date range
      <select
        value={rangeDays}
        onChange={(e) =>
          onChange(
            Number(e.target.value) as (typeof RANGE_OPTIONS)[number]["days"],
          )
        }
        className="field rounded-lg px-2.5 py-1 text-sm font-medium text-ink outline-none"
      >
        {RANGE_OPTIONS.map((o) => (
          <option key={o.days} value={o.days}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuotesAnalytics({ stats }: { stats: QuoteStat[] }) {
  const [rangeDays, setRangeDays] =
    useState<(typeof RANGE_OPTIONS)[number]["days"]>(7);
  const [statusFilter, setStatusFilter] = useState<StatusOrAll>("all");

  const today = todayKey();
  const yesterday = yesterdayKey();
  const todaySummary = useMemo(() => summariseDay(stats, today), [stats, today]);
  const yesterdaySummary = useMemo(
    () => summariseDay(stats, yesterday),
    [stats, yesterday],
  );

  const buckets = useMemo(
    () => buildDailyBuckets(stats, rangeDays),
    [stats, rangeDays],
  );
  const prevBuckets = useMemo(
    () => buildDailyBuckets(stats, rangeDays, rangeDays),
    [stats, rangeDays],
  );
  const windowStats = useMemo(() => {
    const keys = new Set(buckets.map((b) => b.key));
    return stats.filter((s) => keys.has(dayKey(s.receivedAt)));
  }, [stats, buckets]);

  const winRatePoints: LinePoint[] = useMemo(
    () =>
      buckets.map((b) => {
        const dayStats = windowStats.filter((s) => dayKey(s.receivedAt) === b.key);
        const wonCount = dayStats.filter((s) => s.status === "won").length;
        const lostCount = dayStats.filter((s) => s.status === "lost").length;
        const total = wonCount + lostCount;
        return {
          label: b.label,
          value: total > 0 ? (wonCount / total) * 100 : 0,
        };
      }),
    [buckets, windowStats],
  );
  const wonCount = windowStats.filter((s) => s.status === "won").length;
  const lostCount = windowStats.filter((s) => s.status === "lost").length;
  const winRate =
    wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : null;
  const prevWindowStats = useMemo(() => {
    const keys = new Set(prevBuckets.map((b) => b.key));
    return stats.filter((s) => keys.has(dayKey(s.receivedAt)));
  }, [stats, prevBuckets]);
  const prevWonCount = prevWindowStats.filter((s) => s.status === "won").length;
  const prevLostCount = prevWindowStats.filter((s) => s.status === "lost").length;
  const prevWinRate =
    prevWonCount + prevLostCount > 0
      ? (prevWonCount / (prevWonCount + prevLostCount)) * 100
      : null;

  const jobTypeRows = useMemo(() => {
    const groups = new Map<JobType, number[]>();
    for (const s of windowStats) {
      if (s.value == null) continue;
      const arr = groups.get(s.jobType) ?? [];
      arr.push(s.value);
      groups.set(s.jobType, arr);
    }
    return Array.from(groups.entries())
      .map(([jobType, values]) => ({
        jobType,
        count: values.length,
        median: median(values) ?? 0,
      }))
      .sort((a, b) => b.median - a.median)
      .slice(0, 5);
  }, [windowStats]);
  const maxJobTypeMedian = Math.max(1, ...jobTypeRows.map((r) => r.median));

  const wonValues = windowStats
    .filter((s) => s.status === "won" && s.value != null)
    .map((s) => s.value as number);
  const lostValues = windowStats
    .filter((s) => s.status === "lost" && s.value != null)
    .map((s) => s.value as number);
  const wonMedian = median(wonValues);
  const lostMedian = median(lostValues);
  const maxOutcomeMedian = Math.max(1, wonMedian ?? 0, lostMedian ?? 0);

  const filteredStats = useMemo(
    () =>
      statusFilter === "all"
        ? stats
        : stats.filter((s) => s.status === statusFilter),
    [stats, statusFilter],
  );
  const filteredBuckets = useMemo(
    () => buildDailyBuckets(filteredStats, rangeDays),
    [filteredStats, rangeDays],
  );
  const filteredPrevBuckets = useMemo(
    () => buildDailyBuckets(filteredStats, rangeDays, rangeDays),
    [filteredStats, rangeDays],
  );
  const filteredWindowValues = useMemo(() => {
    const keys = new Set(filteredBuckets.map((b) => b.key));
    return filteredStats
      .filter((s) => s.value != null && keys.has(dayKey(s.receivedAt)))
      .map((s) => s.value as number);
  }, [filteredStats, filteredBuckets]);
  const filteredPrevWindowValues = useMemo(() => {
    const keys = new Set(filteredPrevBuckets.map((b) => b.key));
    return filteredStats
      .filter((s) => s.value != null && keys.has(dayKey(s.receivedAt)))
      .map((s) => s.value as number);
  }, [filteredStats, filteredPrevBuckets]);

  const totalCount = filteredBuckets.reduce((sum, b) => sum + b.count, 0);
  const prevTotalCount = filteredPrevBuckets.reduce((sum, b) => sum + b.count, 0);
  const medianValue = median(filteredWindowValues);
  const prevMedianValue = median(filteredPrevWindowValues);

  const filterLabel = STATUS_FILTERS.find((f) => f.key === statusFilter)!.label;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Quote volume and estimated value across your pipeline."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Quotes today</p>
          <p className="mt-0.5 text-xl font-semibold text-ink">
            {todaySummary.count}
          </p>
          <p className="text-xs text-muted">{yesterdaySummary.count} yesterday</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Median estimate today</p>
          <p className="mt-0.5 text-xl font-semibold text-ink">
            {todaySummary.median != null ? formatMoney(todaySummary.median) : "—"}
          </p>
          <p className="text-xs text-muted">
            {yesterdaySummary.median != null
              ? formatMoney(yesterdaySummary.median)
              : "—"}{" "}
            yesterday
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          Your overview
        </h2>
        <RangeSelect rangeDays={rangeDays} onChange={setRangeDays} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:bg-black/[0.04]",
              ].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={
            statusFilter === "all" ? "Quotes received" : `${filterLabel} quotes`
          }
          value={formatCount(totalCount)}
          deltaLabel={`${prevTotalCount} previous period`}
          data={filteredBuckets.map((b) => ({ label: b.label, value: b.count }))}
          formatValue={formatCount}
        />
        <StatCard
          title={
            statusFilter === "all"
              ? "Median quote value"
              : `${filterLabel} median value`
          }
          value={medianValue != null ? formatMoney(medianValue) : "—"}
          deltaLabel={
            prevMedianValue != null
              ? `${formatMoney(prevMedianValue)} previous period`
              : "No quotes previous period"
          }
          data={filteredBuckets.map((b) => ({
            label: b.label,
            value: median(b.values) ?? 0,
          }))}
          formatValue={compactMoney}
        />
        <StatCard
          title="Completion rate"
          value={winRate != null ? formatPercent(winRate) : "—"}
          deltaLabel={
            prevWinRate != null
              ? `${formatPercent(prevWinRate)} previous period`
              : "No completed/lost previous period"
          }
          data={winRatePoints}
          formatValue={formatPercent}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Value by job type</p>
          <p className="text-xs text-muted">Median estimate, this range</p>
          <div className="mt-3 space-y-2.5">
            {jobTypeRows.length === 0 ? (
              <p className="text-sm text-muted">No quotes in this range.</p>
            ) : (
              jobTypeRows.map((row) => (
                <BarRow
                  key={row.jobType}
                  label={jobTypeLabel(row.jobType)}
                  count={row.count}
                  value={row.median}
                  pct={(row.median / maxJobTypeMedian) * 100}
                />
              ))
            )}
          </div>
        </div>

        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Completed vs. lost value</p>
          <p className="text-xs text-muted">Median estimate, this range</p>
          <div className="mt-3 space-y-2.5">
            <BarRow
              label={statusLabel("won")}
              count={wonValues.length}
              value={wonMedian}
              pct={((wonMedian ?? 0) / maxOutcomeMedian) * 100}
              color={statusColor("won").fg}
            />
            <BarRow
              label={statusLabel("lost")}
              count={lostValues.length}
              value={lostMedian}
              pct={((lostMedian ?? 0) / maxOutcomeMedian) * 100}
              color={statusColor("lost").fg}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/** Jobs lens: won work valued by actual price, plus estimate accuracy. */
function JobsAnalytics({ stats }: { stats: QuoteStat[] }) {
  const [rangeDays, setRangeDays] =
    useState<(typeof RANGE_OPTIONS)[number]["days"]>(7);

  const won = useMemo(
    () => stats.filter((s) => s.status === "won"),
    [stats],
  );

  // Reuse bucket helpers by projecting actual price into `value`.
  const priced = useMemo(
    () =>
      won.map((s) => ({
        ...s,
        value: s.actualValue,
      })),
    [won],
  );

  const today = todayKey();
  const yesterday = yesterdayKey();
  const todaySummary = useMemo(() => summariseDay(priced, today), [priced, today]);
  const yesterdaySummary = useMemo(
    () => summariseDay(priced, yesterday),
    [priced, yesterday],
  );

  const buckets = useMemo(
    () => buildDailyBuckets(priced, rangeDays),
    [priced, rangeDays],
  );
  const prevBuckets = useMemo(
    () => buildDailyBuckets(priced, rangeDays, rangeDays),
    [priced, rangeDays],
  );

  const windowJobs = useMemo(() => {
    const keys = new Set(buckets.map((b) => b.key));
    return won.filter((s) => keys.has(dayKey(s.receivedAt)));
  }, [won, buckets]);
  const prevWindowJobs = useMemo(() => {
    const keys = new Set(prevBuckets.map((b) => b.key));
    return won.filter((s) => keys.has(dayKey(s.receivedAt)));
  }, [won, prevBuckets]);

  const windowActuals = windowJobs
    .map((s) => s.actualValue)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const prevWindowActuals = prevWindowJobs
    .map((s) => s.actualValue)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const totalRevenue = windowActuals.reduce((sum, v) => sum + v, 0);
  const prevTotalRevenue = prevWindowActuals.reduce((sum, v) => sum + v, 0);
  const avgJob = median(windowActuals);
  const prevAvgJob = median(prevWindowActuals);

  const accuracyErrors = windowJobs
    .map((s) => {
      if (s.actualValue == null) return null;
      const mid = estimateMidpoint(s.quoteMinExVat, s.quoteMaxExVat);
      if (mid == null || mid === 0) return null;
      return Math.abs((100 * (s.actualValue - mid)) / mid);
    })
    .filter((v): v is number => v != null);
  const accuracyWithin =
    accuracyErrors.length > 0
      ? Math.round(
          accuracyErrors.reduce((sum, v) => sum + v, 0) / accuracyErrors.length,
        )
      : null;

  const prevAccuracyErrors = prevWindowJobs
    .map((s) => {
      if (s.actualValue == null) return null;
      const mid = estimateMidpoint(s.quoteMinExVat, s.quoteMaxExVat);
      if (mid == null || mid === 0) return null;
      return Math.abs((100 * (s.actualValue - mid)) / mid);
    })
    .filter((v): v is number => v != null);
  const prevAccuracyWithin =
    prevAccuracyErrors.length > 0
      ? Math.round(
          prevAccuracyErrors.reduce((sum, v) => sum + v, 0) /
            prevAccuracyErrors.length,
        )
      : null;

  const accuracyPoints: LinePoint[] = useMemo(
    () =>
      buckets.map((b) => {
        const dayJobs = windowJobs.filter((s) => dayKey(s.receivedAt) === b.key);
        const errors = dayJobs
          .map((s) => {
            if (s.actualValue == null) return null;
            const mid = estimateMidpoint(s.quoteMinExVat, s.quoteMaxExVat);
            if (mid == null || mid === 0) return null;
            return Math.abs((100 * (s.actualValue - mid)) / mid);
          })
          .filter((v): v is number => v != null);
        return {
          label: b.label,
          value:
            errors.length > 0
              ? errors.reduce((sum, v) => sum + v, 0) / errors.length
              : 0,
        };
      }),
    [buckets, windowJobs],
  );

  const jobTypeRows = useMemo(() => {
    const groups = new Map<JobType, number[]>();
    for (const s of windowJobs) {
      if (s.actualValue == null) continue;
      const arr = groups.get(s.jobType) ?? [];
      arr.push(s.actualValue);
      groups.set(s.jobType, arr);
    }
    return Array.from(groups.entries())
      .map(([jobType, values]) => ({
        jobType,
        count: values.length,
        median: median(values) ?? 0,
        total: values.reduce((sum, v) => sum + v, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [windowJobs]);
  const maxJobTypeTotal = Math.max(1, ...jobTypeRows.map((r) => r.total));

  const pricedCount = windowActuals.length;
  const unpricedCount = windowJobs.length - pricedCount;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Completed jobs valued by the prices you logged, not estimates."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Jobs completed today</p>
          <p className="mt-0.5 text-xl font-semibold text-ink">
            {todaySummary.count}
          </p>
          <p className="text-xs text-muted">{yesterdaySummary.count} yesterday</p>
        </div>
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">
            Median actual price today
          </p>
          <p className="mt-0.5 text-xl font-semibold text-ink">
            {todaySummary.median != null ? formatMoney(todaySummary.median) : "—"}
          </p>
          <p className="text-xs text-muted">
            {yesterdaySummary.median != null
              ? formatMoney(yesterdaySummary.median)
              : "—"}{" "}
            yesterday
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          Your overview
        </h2>
        <RangeSelect rangeDays={rangeDays} onChange={setRangeDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Jobs completed"
          value={formatCount(windowJobs.length)}
          deltaLabel={`${prevWindowJobs.length} previous period`}
          data={buckets.map((b) => ({ label: b.label, value: b.count }))}
          formatValue={formatCount}
        />
        <StatCard
          title="Total revenue"
          value={pricedCount > 0 ? formatMoney(totalRevenue) : "—"}
          deltaLabel={
            prevWindowActuals.length > 0
              ? `${formatMoney(prevTotalRevenue)} previous period`
              : "No priced jobs previous period"
          }
          data={buckets.map((b) => ({
            label: b.label,
            value: b.total,
          }))}
          formatValue={compactMoney}
        />
        <StatCard
          title="Estimate accuracy"
          value={
            accuracyWithin != null ? `within ${accuracyWithin}%` : "—"
          }
          deltaLabel={
            prevAccuracyWithin != null
              ? `within ${prevAccuracyWithin}% previous period`
              : "No priced jobs previous period"
          }
          data={accuracyPoints}
          formatValue={(v) => `${Math.round(v)}%`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Revenue by job type</p>
          <p className="text-xs text-muted">Actual price total, this range</p>
          <div className="mt-3 space-y-2.5">
            {jobTypeRows.length === 0 ? (
              <p className="text-sm text-muted">
                No priced jobs in this range. Log prices on Jobs to unlock this.
              </p>
            ) : (
              jobTypeRows.map((row) => (
                <BarRow
                  key={row.jobType}
                  label={jobTypeLabel(row.jobType)}
                  count={row.count}
                  value={row.total}
                  pct={(row.total / maxJobTypeTotal) * 100}
                />
              ))
            )}
          </div>
        </div>

        <div className="surface rounded-2xl p-4">
          <p className="text-xs font-medium text-ink-soft">Pricing coverage</p>
          <p className="text-xs text-muted">
            Avg job {avgJob != null ? formatMoney(avgJob) : "—"}
            {prevAvgJob != null
              ? ` · ${formatMoney(prevAvgJob)} previous`
              : ""}
          </p>
          <div className="mt-3 space-y-2.5">
            <BarRow
              label="Price logged"
              count={pricedCount}
              value={pricedCount > 0 ? totalRevenue : null}
              pct={
                windowJobs.length > 0
                  ? (pricedCount / windowJobs.length) * 100
                  : 0
              }
              color={statusColor("won").fg}
            />
            <BarRow
              label="Awaiting price"
              count={unpricedCount}
              value={null}
              pct={
                windowJobs.length > 0
                  ? (unpricedCount / windowJobs.length) * 100
                  : 0
              }
              color="var(--color-muted)"
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function AnalyticsClient({ stats }: { stats: QuoteStat[] }) {
  const { mode } = useDashboardMode();

  if (mode === "jobs") {
    return <JobsAnalytics stats={stats} />;
  }
  return <QuotesAnalytics stats={stats} />;
}
