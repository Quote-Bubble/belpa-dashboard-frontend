/**
 * Dashboard-facing types.
 *
 * The persisted lead fields mirror the `leads` table (see
 * belpa-backend/lib/leads.ts). Only fields that actually exist on a row are
 * modelled here — if the database doesn't store it, the dashboard doesn't
 * show it.
 */

export type LeadStatus = "new" | "contacted" | "won" | "lost";

/**
 * How much intent a lead has shown (mirrors LeadIntent in the backend). Lets
 * the table tier leads so a roofer can tell a genuine quote request from
 * someone who just peeked at a price. `estimate_viewed` = "priced only".
 */
export type LeadIntent =
  | "estimate_viewed"
  | "quote_requested"
  | "callback_requested";

export type JobType =
  | "full_replacement"
  | "tile_or_slate_repair"
  | "flat_roof_replacement"
  | "leak_investigation"
  | "gutters_fascias_soffits"
  | "other";

export type SeverityScore = 1 | 2 | 3 | 4 | 5;

export type DashboardLead = {
  id: string;
  status: LeadStatus;
  intent: LeadIntent;
  leadType: "quote" | "manual_consultation";
  jobType: JobType;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  addressFormatted: string;
  addressPostcode: string;
  quoteMinExVat: number | null;
  quoteMaxExVat: number | null;
  /** Roofer-entered won price (ex VAT). Null until they fill it on Jobs. */
  actualPriceExVat: number | null;
  /**
   * Damage severity 1-5, graded from customer photos by the backend. Null is
   * the norm, not an error: the job type never offered photos, the customer
   * skipped them, or the grader was unsure. Read-only here — see migration
   * 0019, which deliberately grants no UPDATE on this column.
   */
  severity: SeverityScore | null;
  receivedAt: string; // ISO timestamp
  /** Persisted on `leads.archived`. Hidden from the main tabs; shown under "Archived". */
  archived: boolean;
};

// ---------------------------------------------------------------------------
// leads.payload (jsonb)
//
// Mirrors LeadPayload in belpa-backend/lib/types.ts, which is the source of
// truth — the backend stores the widget's payload verbatim. Everything is
// optional on read: rows written by older widget versions may be missing keys,
// so treat this as untrusted shape and render "—" rather than inventing values.
// ---------------------------------------------------------------------------

export type LatLng = { lat: number; lng: number };

export type RoofType = "gable" | "hip" | "flat";

export type ConditionAnswer = "yes" | "no" | "not_sure";

export type RooflineScope = "gutters_only" | "gutters_fascias";

export type LeadPayload = {
  otherJobDescription?: string | null;
  coords?: LatLng | null;
  solar?: {
    areaM2?: number | null;
    groundAreaM2?: number | null;
    pitchDegrees?: number | null;
    roofType?: RoofType | null;
    measurementMethod?: string | null;
    imageryQuality?: string | null;
    imageryDate?: string | null;
  } | null;
  /** Outline of ONE roof face — the widget keeps only the largest and discards
   *  the rest (belpa-widget-frontend/lib/quote-flow.ts:532). When the customer
   *  never drew, it falls back to a rectangle from the scan bounding box. */
  polygonCoords?: LatLng[] | null;
  /** Repair-only damaged patch the customer boxed on the satellite map. */
  affectedArea?: LatLng[] | null;
  /** Centre + zoom of the satellite map the customer drew on. Lets the roof
   *  reopen on the framing they actually saw instead of one inferred from the
   *  polygon. Absent on leads captured before the widget sent it, and on
   *  consultations, which never show a map. */
  mapView?: { center: LatLng; zoom: number } | null;
  conditionAnswer?: ConditionAnswer | null;
  conditionFlagged?: boolean;
  material?: string | null;
  propertyType?: string | null;
  storeys?: number | null;
  /** Totals only — which edges the customer marked as gutters is not stored. */
  roofline?: {
    perimeterM?: number | null;
    gutterLengthM?: number | null;
    scope?: RooflineScope | null;
  } | null;
  /** Counts only — the positions the customer placed are not stored. */
  obstructions?: {
    chimneys?: number | null;
    rooflights?: number | null;
  } | null;
  fallbackReason?: string | null;
  /**
   * Storage paths in the private `lead-photos` bucket, in the order the
   * customer added them. Read via short-lived signed URLs — never public.
   */
  damage?: {
    photoPaths?: string[] | null;
    severity?: {
      score?: number | null;
      confidence?: string | null;
      visibleIssues?: string[] | null;
      model?: string | null;
    } | null;
  } | null;
};

/** Fetch state for one lead's payload, loaded lazily when a row is expanded. */
export type LeadPayloadState = {
  data: LeadPayload | null;
  loading: boolean;
  error: string | null;
};

/** Per-roofer pricing profile edited on the Account page. Persisted in
 *  `roofer_pricing` (see supabase/migrations/0002_roofer_pricing.sql). */
export type PricingProfile = {
  materials: { key: string; label: string; unit: string; rate: number }[];
  labourPerDay: number;
  minimumCallout: number;
  skipHire: number;
  scaffoldPerWeek: number;
  vatRegistered: boolean;
};

/** A row from `roofers`, scoped by RLS to companies the user belongs to. */
export type RooferProfile = {
  id: string;
  slug: string;
  name: string;
  /** Embed domain allowlist. Empty = the widget may be framed anywhere. */
  allowed_origins: string[];
};

/** Whether the roofer's widget is set up yet (admin ops console). "prospect" is
 *  the stored value for "to set up". */
export type DeployStatus = "prospect" | "live";

/** A roofer row as seen in the admin console (full ops fields). */
export type RooferAdminRow = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  deploy_status: DeployStatus;
  created_at: string;
};
