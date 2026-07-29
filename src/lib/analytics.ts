/**
 * Pure aggregation helpers for the Analytics page. Everything here works over
 * plain { receivedAt, value, status } tuples so it has no dependency on how
 * the data was fetched — the page fetches once, these just bucket/summarise it.
 */

import type { JobType, LeadStatus } from "@/lib/types";

export type QuoteStat = {
  receivedAt: string; // ISO timestamp
  /** Quote midpoint ex-VAT, or null (e.g. consultation leads). */
  value: number | null;
  /** Roofer-entered won price ex-VAT. Null until logged on Jobs. */
  actualValue: number | null;
  quoteMinExVat: number | null;
  quoteMaxExVat: number | null;
  status: LeadStatus;
  jobType: JobType;
};

/** Midpoint of a quote range, or null when either bound is missing. */
export function quoteValue(min: number | null, max: number | null): number | null {
  if (min == null || max == null) return null;
  return (min + max) / 2;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Pin to Europe/London so "today" and day-bucket boundaries match the rest of
// the dashboard regardless of server timezone.
const DAY_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  month: "short",
  day: "numeric",
});

/** Calendar-day key ("2026-07-23") in the roofer's timezone. */
export function dayKey(iso: string): string {
  return DAY_KEY_FORMAT.format(new Date(iso));
}

/** Shift a London YYYY-MM-DD key by `delta` calendar days via UTC arithmetic
 *  so DST transitions never collapse two iterations onto the same key. */
export function shiftDayKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function labelForDayKey(key: string): string {
  // Noon UTC keeps the London calendar day stable around midnight boundaries.
  return DAY_LABEL_FORMAT.format(new Date(`${key}T12:00:00.000Z`));
}

export type DailyBucket = {
  key: string;
  label: string;
  count: number;
  total: number;
  values: number[];
};

/** One bucket per day for a `days`-long window ending `endOffsetDays` days
 *  ago (0 = ending today). Pass `endOffsetDays = days` to get the same-length
 *  window immediately preceding the current one, for period comparisons.
 *  Buckets always exist for the full range even on days with zero quotes. */
export function buildDailyBuckets(
  stats: QuoteStat[],
  days: number,
  endOffsetDays = 0,
): DailyBucket[] {
  const buckets = new Map<string, DailyBucket>();
  const order: string[] = [];
  const endKey = shiftDayKey(todayKey(), -endOffsetDays);
  for (let i = days - 1; i >= 0; i--) {
    const key = shiftDayKey(endKey, -i);
    order.push(key);
    buckets.set(key, {
      key,
      label: labelForDayKey(key),
      count: 0,
      total: 0,
      values: [],
    });
  }
  for (const s of stats) {
    const bucket = buckets.get(dayKey(s.receivedAt));
    if (!bucket) continue; // outside the window
    bucket.count += 1;
    if (s.value != null) {
      bucket.total += s.value;
      bucket.values.push(s.value);
    }
  }
  return order.map((k) => buckets.get(k)!);
}

/** Sum + count + median for every stat matching a calendar-day key. */
export function summariseDay(stats: QuoteStat[], key: string) {
  const values: number[] = [];
  let count = 0;
  for (const s of stats) {
    if (dayKey(s.receivedAt) !== key) continue;
    count += 1;
    if (s.value != null) values.push(s.value);
  }
  return {
    count,
    total: values.reduce((sum, v) => sum + v, 0),
    median: median(values),
  };
}

export function todayKey(): string {
  return dayKey(new Date().toISOString());
}

export function yesterdayKey(): string {
  return shiftDayKey(todayKey(), -1);
}
