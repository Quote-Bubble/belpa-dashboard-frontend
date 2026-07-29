/**
 * Pure helpers for the Jobs view: variance vs our estimate, and aggregate stats.
 */

export type JobStatInput = {
  quoteMinExVat: number | null;
  quoteMaxExVat: number | null;
  actualPriceExVat: number | null;
};

export type VarianceKind = "within" | "above" | "below" | "empty";

export type VarianceResult = {
  kind: VarianceKind;
  /** Absolute percent vs midpoint, rounded. Null when empty / undefined. */
  pct: number | null;
};

/** Midpoint of our estimate range, or null if incomplete. */
export function estimateMidpoint(
  min: number | null,
  max: number | null,
): number | null {
  if (min == null || max == null) return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return (min + max) / 2;
}

/**
 * Compare the roofer's price to our estimate range.
 * Within [min, max] → within. Else % vs midpoint.
 */
export function priceVariance(
  min: number | null,
  max: number | null,
  actual: number | null,
): VarianceResult {
  if (actual == null || !Number.isFinite(actual)) {
    return { kind: "empty", pct: null };
  }
  if (min != null && max != null && Number.isFinite(min) && Number.isFinite(max)) {
    if (actual >= min && actual <= max) {
      return { kind: "within", pct: 0 };
    }
  }
  const mid = estimateMidpoint(min, max);
  if (mid == null || mid === 0) {
    return { kind: "empty", pct: null };
  }
  const pct = Math.round((100 * (actual - mid)) / mid);
  if (pct > 0) return { kind: "above", pct };
  if (pct < 0) return { kind: "below", pct: Math.abs(pct) };
  return { kind: "within", pct: 0 };
}

export type JobAggregateStats = {
  jobsWon: number;
  totalValue: number;
  pricedCount: number;
  avgJobValue: number | null;
  /** Mean absolute % error vs midpoint across priced jobs. Null if none. */
  accuracyWithinPct: number | null;
  /** won ÷ totalNonArchived. Null if denominator is 0. */
  conversionRate: number | null;
};

export function computeJobStats(
  jobs: JobStatInput[],
  totalNonArchivedLeads: number,
): JobAggregateStats {
  const jobsWon = jobs.length;
  let totalValue = 0;
  let pricedCount = 0;
  let absErrorSum = 0;
  let absErrorCount = 0;

  for (const job of jobs) {
    const actual = job.actualPriceExVat;
    if (actual != null && Number.isFinite(actual)) {
      totalValue += actual;
      pricedCount += 1;
      const mid = estimateMidpoint(job.quoteMinExVat, job.quoteMaxExVat);
      if (mid != null && mid !== 0) {
        absErrorSum += Math.abs((100 * (actual - mid)) / mid);
        absErrorCount += 1;
      }
    }
  }

  return {
    jobsWon,
    totalValue,
    pricedCount,
    avgJobValue: pricedCount > 0 ? totalValue / pricedCount : null,
    accuracyWithinPct:
      absErrorCount > 0 ? Math.round(absErrorSum / absErrorCount) : null,
    conversionRate:
      totalNonArchivedLeads > 0 ? jobsWon / totalNonArchivedLeads : null,
  };
}
