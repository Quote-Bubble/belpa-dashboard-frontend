import { describe, expect, it } from "vitest";

import { severityLabel, severityTone } from "@/lib/format";
import { mapLeadRow, type LeadRow } from "@/lib/leads";
import type { SeverityScore } from "@/lib/types";

const SCORES: SeverityScore[] = [1, 2, 3, 4, 5];

function row(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "lead-1",
    status: "new",
    intent: "quote_requested",
    lead_type: "quote",
    job_type: "tile_or_slate_repair",
    contact_name: "Alex Example",
    contact_phone: "07123456789",
    contact_email: null,
    address_formatted: "12 Oakfield Road, Leeds",
    address_postcode: "LS1 1AA",
    quote_min_ex_vat: 800,
    quote_max_ex_vat: 1000,
    actual_price_ex_vat: null,
    severity: null,
    received_at: "2026-08-20T10:00:00.000Z",
    archived: false,
    ...overrides,
  };
}

describe("severityTone()", () => {
  it("gives every score its own colour", () => {
    const fgs = new Set(SCORES.map((s) => severityTone(s).fg));
    expect(fgs.size).toBe(5);
  });

  it("runs green at the mild end and red at the severe end", () => {
    expect(severityTone(1).fg).toBe("#0d6b3c");
    expect(severityTone(5).fg).toBe("#c02626");
  });

  it("reuses hexes already in the palette rather than inventing colours", () => {
    // The convention in this codebase is that semantic colours are shared by
    // value across format.ts — see the note on severityTone.
    expect(severityTone(1).fg).toBe(severityTone(1).fg.toLowerCase());
    for (const score of SCORES) {
      expect(severityTone(score).fg).toMatch(/^#[0-9a-f]{6}$/);
      expect(severityTone(score).bg).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("severityLabel()", () => {
  it("labels each score distinctly", () => {
    const labels = SCORES.map(severityLabel);
    expect(new Set(labels).size).toBe(5);
    expect(severityLabel(1)).toBe("Minimal");
    expect(severityLabel(5)).toBe("Severe");
  });
});

describe("mapLeadRow() severity", () => {
  it("carries a valid score through", () => {
    expect(mapLeadRow(row({ severity: 4 })).severity).toBe(4);
  });

  it("treats a missing severity as null, not zero", () => {
    // Null is the norm, not an error: most leads never offered photos.
    expect(mapLeadRow(row({ severity: null })).severity).toBeNull();
  });

  it("rejects out-of-range values rather than rendering junk", () => {
    // The column is CHECK-constrained, but a row written by a different
    // backend version must not put "Severity 9/5" on a roofer's screen.
    for (const bad of [0, 6, -1, 99]) {
      expect(mapLeadRow(row({ severity: bad })).severity).toBeNull();
    }
  });
});
