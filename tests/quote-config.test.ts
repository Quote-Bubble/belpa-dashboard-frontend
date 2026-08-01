import { describe, expect, it } from "vitest";

import {
  assessCompleteness,
  defaultQuoteConfig,
  legacyToQuoteConfig,
  parseQuoteConfig,
} from "@/lib/quote-config";

describe("quote-config", () => {
  it("defaults enable all services", () => {
    const cfg = defaultQuoteConfig();
    expect(cfg.version).toBe(1);
    expect(cfg.enabledServices).toContain("full_replacement");
    expect(cfg.services.full_replacement?.materials.length).toBeGreaterThan(0);
  });

  it("parse fills missing pieces from defaults", () => {
    const cfg = parseQuoteConfig({
      version: 1,
      enabledServices: ["gutters_fascias_soffits"],
      services: {},
      vatRegistered: false,
    });
    expect(cfg.enabledServices).toEqual(["gutters_fascias_soffits"]);
    expect(cfg.services.gutters_fascias_soffits?.gutterPerMExVat).toBeGreaterThan(
      0,
    );
    expect(cfg.vatRegistered).toBe(false);
  });

  it("legacy migrate maps felt → flat_bitumen", () => {
    const cfg = legacyToQuoteConfig({
      materials: [
        { key: "felt", label: "Felt", rate: 55 },
        { key: "concrete_tile", label: "Concrete", rate: 90 },
      ],
      labourPerDay: 200,
      minimumCallout: 100,
      skipHire: 300,
      scaffoldPerWeek: 700,
      vatRegistered: true,
    });
    const flat = cfg.services.flat_roof_replacement!;
    const bitumen = flat.materials.find((m) => m.key === "flat_bitumen");
    expect(bitumen?.rateExVat).toBe(55);
    expect(flat.access.rateExVat).toBe(700);
  });

  it("completeness requires enabled priced services with rates", () => {
    const cfg = defaultQuoteConfig();
    cfg.enabledServices = ["leak_investigation"];
    const empty = assessCompleteness(cfg);
    expect(empty.ready).toBe(false);

    cfg.enabledServices = ["full_replacement"];
    const ok = assessCompleteness(cfg);
    expect(ok.ready).toBe(true);
  });
});
