import { describe, expect, it } from "vitest";

import { displayPostcode, intentLabel, intentTone } from "@/lib/format";
import type { LeadIntent } from "@/lib/types";

const INTENTS: LeadIntent[] = [
  "estimate_viewed",
  "quote_requested",
  "callback_requested",
];

describe("intentLabel()", () => {
  it("labels each intent", () => {
    expect(intentLabel("estimate_viewed")).toBe("Priced only");
    expect(intentLabel("quote_requested")).toBe("Quote requested");
    expect(intentLabel("callback_requested")).toBe("Callback requested");
  });

  // Older rows predate intent tiering; quotes/page.tsx coerces those to a
  // valid value, but the label must not blow up if one slips through.
  it("falls back for an unknown value", () => {
    expect(intentLabel("something_else" as LeadIntent)).toBe("Priced only");
  });
});

describe("intentTone()", () => {
  it("returns a distinct colour pair per intent", () => {
    const tones = INTENTS.map((i) => intentTone(i));
    for (const tone of tones) {
      expect(tone.fg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tone.bg).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(new Set(tones.map((t) => t.fg)).size).toBe(INTENTS.length);
  });

  it("keeps estimate_viewed on the Follow-up filter's slate", () => {
    expect(intentTone("estimate_viewed").fg).toBe("#475569");
  });
});

describe("displayPostcode()", () => {
  it("suppresses a postcode the address already ends with", () => {
    expect(displayPostcode("39 Walton Drive, HP13 6TS", "HP13 6TS")).toBeNull();
  });

  it("ignores case differences", () => {
    expect(displayPostcode("39 Walton Drive, hp13 6ts", "HP13 6TS")).toBeNull();
  });

  it("ignores spacing differences", () => {
    expect(displayPostcode("39 Walton Drive, HP136TS", "HP13 6TS")).toBeNull();
    expect(displayPostcode("39 Walton Drive, HP13 6TS", "HP136TS")).toBeNull();
  });

  it("returns the postcode when the address omits it", () => {
    expect(displayPostcode("39 Walton Drive", "HP13 6TS")).toBe("HP13 6TS");
  });

  it("returns the postcode when there is no address", () => {
    expect(displayPostcode("", "HP13 6TS")).toBe("HP13 6TS");
    expect(displayPostcode(null, "HP13 6TS")).toBe("HP13 6TS");
  });

  it("returns null when there is no postcode", () => {
    expect(displayPostcode("39 Walton Drive", "")).toBeNull();
    expect(displayPostcode("39 Walton Drive", null)).toBeNull();
    expect(displayPostcode("39 Walton Drive", "   ")).toBeNull();
  });

  it("trims a padded postcode", () => {
    expect(displayPostcode("39 Walton Drive", "  HP13 6TS  ")).toBe("HP13 6TS");
  });
});
