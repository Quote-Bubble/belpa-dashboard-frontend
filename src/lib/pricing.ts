import type { PricingProfile } from "@/lib/types";
import {
  defaultQuoteConfig,
  legacyToQuoteConfig,
  parseQuoteConfig,
  type QuoteConfig,
} from "@/lib/quote-config";
import { createClient } from "@/lib/supabase/server";

/**
 * Pricing lives in `roofer_pricing`. Prefer `quote_config` (service-first).
 * Legacy scalar/materials columns are dual-read for older rows.
 */

export const DEFAULT_PRICING: PricingProfile = {
  materials: [
    { key: "concrete_tile", label: "Concrete tile", unit: "£/m²", rate: 48 },
    { key: "clay_tile", label: "Clay tile", unit: "£/m²", rate: 72 },
    { key: "natural_slate", label: "Natural slate", unit: "£/m²", rate: 95 },
    { key: "flat_epdm", label: "EPDM rubber (flat)", unit: "£/m²", rate: 60 },
    { key: "flat_grp", label: "GRP fibreglass (flat)", unit: "£/m²", rate: 85 },
    { key: "felt", label: "Built-up felt (flat)", unit: "£/m²", rate: 45 },
  ],
  labourPerDay: 220,
  minimumCallout: 180,
  skipHire: 260,
  scaffoldPerWeek: 550,
  vatRegistered: true,
};

type PricingRow = {
  materials: PricingProfile["materials"] | null;
  labour_per_day: number | null;
  minimum_callout: number | null;
  skip_hire: number | null;
  scaffold_per_week: number | null;
  vat_registered: boolean | null;
  quote_config: unknown | null;
};

function rowToLegacyProfile(row: PricingRow): PricingProfile {
  const stored = row.materials?.length ? row.materials : null;
  const materials = stored
    ? DEFAULT_PRICING.materials.map((d) => {
        const match = stored.find((m) => m.key === d.key);
        return match ? { ...d, rate: match.rate } : d;
      })
    : DEFAULT_PRICING.materials;

  return {
    materials,
    labourPerDay: row.labour_per_day ?? DEFAULT_PRICING.labourPerDay,
    minimumCallout: row.minimum_callout ?? DEFAULT_PRICING.minimumCallout,
    skipHire: row.skip_hire ?? DEFAULT_PRICING.skipHire,
    scaffoldPerWeek: row.scaffold_per_week ?? DEFAULT_PRICING.scaffoldPerWeek,
    vatRegistered: row.vat_registered ?? DEFAULT_PRICING.vatRegistered,
  };
}

/** Load quote config for a roofer (quote_config or legacy migrate). */
export async function getQuoteConfig(rooferId: string): Promise<QuoteConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roofer_pricing")
    .select(
      "materials,labour_per_day,minimum_callout,skip_hire,scaffold_per_week,vat_registered,quote_config",
    )
    .eq("roofer_id", rooferId)
    .maybeSingle();

  if (error || !data) return defaultQuoteConfig();
  const row = data as PricingRow;
  if (row.quote_config) return parseQuoteConfig(row.quote_config);
  return legacyToQuoteConfig(rowToLegacyProfile(row));
}

/** @deprecated Prefer getQuoteConfig — kept for any legacy callers. */
export async function getPricing(rooferId: string): Promise<PricingProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roofer_pricing")
    .select(
      "materials,labour_per_day,minimum_callout,skip_hire,scaffold_per_week,vat_registered",
    )
    .eq("roofer_id", rooferId)
    .maybeSingle();

  if (error || !data) return DEFAULT_PRICING;
  return rowToLegacyProfile(data as PricingRow);
}

/** Persist quote_config (and mirror vat onto legacy column). */
export async function saveQuoteConfig(
  rooferId: string,
  config: QuoteConfig,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("roofer_pricing").upsert(
    {
      roofer_id: rooferId,
      quote_config: config,
      vat_registered: config.vatRegistered,
    },
    { onConflict: "roofer_id" },
  );
  return { error: error?.message ?? null };
}
