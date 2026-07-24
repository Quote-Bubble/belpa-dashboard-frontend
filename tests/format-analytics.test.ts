import { describe, expect, it } from "vitest";

import {
  formatRelativeTime,
  isSafeMailtoHref,
  isSafeTelHref,
  whatsappLink,
} from "@/lib/format";
import { buildDailyBuckets, shiftDayKey, type QuoteStat } from "@/lib/analytics";

describe("whatsappLink", () => {
  it("rewrites UK 07 numbers to 447", () => {
    expect(whatsappLink("07700 900123")).toBe("https://wa.me/447700900123");
  });

  it("strips 00 so 00447 does not become 440447", () => {
    expect(whatsappLink("00447700900123")).toBe("https://wa.me/447700900123");
  });
});

describe("tel/mailto guards", () => {
  it("rejects DTMF / query injection", () => {
    expect(isSafeTelHref("07700900123,1234")).toBe(false);
    expect(isSafeMailtoHref("a@b.com?cc=evil@x.com")).toBe(false);
    expect(isSafeTelHref("07700 900123")).toBe(true);
    expect(isSafeMailtoHref("a@b.com")).toBe(true);
  });
});

describe("formatRelativeTime", () => {
  it("treats future timestamps as just now", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(formatRelativeTime(future)).toBe("just now");
  });

  it("caps long spans instead of endless weeks", () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const label = formatRelativeTime(old);
    expect(label).not.toMatch(/^\d+w ago$/);
  });
});

describe("buildDailyBuckets DST safety", () => {
  it("emits unique keys for a 14-day window", () => {
    const stats: QuoteStat[] = [];
    const buckets = buildDailyBuckets(stats, 14, 0);
    const keys = buckets.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(14);
  });

  it("shiftDayKey walks calendar days via UTC", () => {
    expect(shiftDayKey("2026-03-30", -1)).toBe("2026-03-29");
    expect(shiftDayKey("2026-03-29", 1)).toBe("2026-03-30");
  });
});
