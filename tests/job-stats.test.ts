import { describe, expect, it } from "vitest";

import {
  computeJobStats,
  estimateMidpoint,
  priceVariance,
} from "@/lib/job-stats";

describe("estimateMidpoint", () => {
  it("averages min and max", () => {
    expect(estimateMidpoint(100, 200)).toBe(150);
  });

  it("returns null when either side is missing", () => {
    expect(estimateMidpoint(null, 200)).toBeNull();
    expect(estimateMidpoint(100, null)).toBeNull();
  });
});

describe("priceVariance", () => {
  it("marks empty when there is no price", () => {
    expect(priceVariance(100, 200, null)).toEqual({ kind: "empty", pct: null });
  });

  it("marks within range inclusive", () => {
    expect(priceVariance(100, 200, 100)).toEqual({ kind: "within", pct: 0 });
    expect(priceVariance(100, 200, 200)).toEqual({ kind: "within", pct: 0 });
    expect(priceVariance(100, 200, 150)).toEqual({ kind: "within", pct: 0 });
  });

  it("reports percent above midpoint when outside range", () => {
    // mid 150, actual 225 → +50% (outside [100, 200])
    expect(priceVariance(100, 200, 225)).toEqual({ kind: "above", pct: 50 });
  });

  it("reports percent below midpoint when outside range", () => {
    // mid 150, actual 75 → −50% (outside [100, 200])
    expect(priceVariance(100, 200, 75)).toEqual({ kind: "below", pct: 50 });
  });
});

describe("computeJobStats", () => {
  it("aggregates value, accuracy and conversion", () => {
    const stats = computeJobStats(
      [
        { quoteMinExVat: 100, quoteMaxExVat: 200, actualPriceExVat: 150 },
        { quoteMinExVat: 100, quoteMaxExVat: 200, actualPriceExVat: 180 },
        { quoteMinExVat: 100, quoteMaxExVat: 200, actualPriceExVat: null },
      ],
      10,
    );
    expect(stats.jobsWon).toBe(3);
    expect(stats.pricedCount).toBe(2);
    expect(stats.totalValue).toBe(330);
    expect(stats.avgJobValue).toBe(165);
    // |0| + |20| (180 vs mid 150) → avg 10
    expect(stats.accuracyWithinPct).toBe(10);
    expect(stats.conversionRate).toBe(0.3);
  });

  it("returns nulls when there is nothing to measure", () => {
    const stats = computeJobStats([], 0);
    expect(stats.avgJobValue).toBeNull();
    expect(stats.accuracyWithinPct).toBeNull();
    expect(stats.conversionRate).toBeNull();
  });
});
