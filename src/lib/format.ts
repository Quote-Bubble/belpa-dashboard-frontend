import type {
  ConditionAnswer,
  JobType,
  LeadIntent,
  LeadStatus,
  RooflineScope,
  SeverityScore,
} from "@/lib/types";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** "£8,200 – £11,400" or "—" when no quote (e.g. consultation leads). */
export function formatQuoteRange(
  min: number | null,
  max: number | null,
): string {
  if (min == null || max == null) return "—";
  if (min === max) return gbp.format(min);
  return `${gbp.format(min)} – ${gbp.format(max)}`;
}

export function formatMoney(value: number): string {
  return gbp.format(value);
}

/** Compact relative time: "1h ago", "3d ago". Caps at weeks, then a short date. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "just now";
  const diffMs = Date.now() - then;
  // Clock skew / future timestamps — don't emit negative units.
  if (diffMs < 0) return "just now";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks <= 8) return `${weeks}w ago`;
  return formatDateOnly(iso);
}

/** Full date for the detail panel. Timezone is pinned to Europe/London so the
 *  server (often UTC) and the client render byte-identical strings — otherwise
 *  React hydration mismatches on the formatted wall-clock time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

const JOB_LABELS: Record<JobType, string> = {
  full_replacement: "Full replacement",
  tile_or_slate_repair: "Tile / slate repair",
  flat_roof_replacement: "Flat roof replacement",
  leak_investigation: "Leak investigation",
  gutters_fascias_soffits: "Gutters, fascias & soffits",
  roof_soft_wash: "Roof soft wash",
  roof_biocide_treatment: "Biocide treatment",
  gutter_clearing: "Gutter clearing",
  driveway_cleaning: "Driveway cleaning",
  other: "Other",
};

export function jobTypeLabel(job: JobType): string {
  return JOB_LABELS[job] ?? "Other";
}

// Internal status value stays "won"; roofers see "Completed".
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  won: "Completed",
  lost: "Lost",
};

export function statusLabel(status: LeadStatus): string {
  return STATUS_LABELS[status];
}

export const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "won", "lost"];

/** Tailwind-ish inline style values keyed by status (kept as raw CSS for the badge). */
export function statusColor(status: LeadStatus): { fg: string; bg: string } {
  switch (status) {
    case "new":
      return { fg: "#1546c9", bg: "#eef4ff" };
    case "contacted":
      return { fg: "#6d28d9", bg: "#f3e8ff" };
    case "won":
      return { fg: "#0d6b3c", bg: "#e6f6ee" };
    case "lost":
      return { fg: "#c02626", bg: "#fdeaea" };
  }
}

// ---------------------------------------------------------------------------
// Intent
//
// How much the customer actually asked for, as opposed to what stage the
// roofer has moved them to. `estimate_viewed` is someone who priced a roof and
// left; the other two asked to be contacted. QuotesClient already tiers on
// this for its "Follow-up" tab — these labels put the same signal on the lead
// itself.
// ---------------------------------------------------------------------------

const INTENT_LABELS: Record<LeadIntent, string> = {
  estimate_viewed: "Priced only",
  quote_requested: "Quote requested",
  callback_requested: "Callback requested",
};

export function intentLabel(intent: LeadIntent): string {
  return INTENT_LABELS[intent] ?? INTENT_LABELS.estimate_viewed;
}

/**
 * Badge colours for intent. Same `{fg, bg}` shape as statusColor, but the
 * backgrounds are deliberately far paler: intent renders as a quiet outlined
 * tag next to the status pill, so the two never compete for the same
 * "filled coloured pill" reading. `estimate_viewed` reuses the slate that
 * QuotesClient's Follow-up filter already uses (FILTER_COLORS.followup.ink),
 * so the tab and the badge agree on what a browser looks like.
 */
/**
 * Severity 1-5 as a green-to-red ramp.
 *
 * Deliberately rendered as an outlined tag or a dot rather than a filled pill:
 * intentTone's note about not competing with the status pill applies doubly
 * here, because severity 1 and 5 borrow the won/lost greens and reds. A filled
 * red "5" sitting inches from a filled red "Lost" would read as a status.
 *
 * Colours are reused by value from statusColor / intentTone / FILTER_COLORS
 * rather than newly invented, which is this codebase's convention.
 */
export function severityTone(score: SeverityScore): { fg: string; bg: string } {
  switch (score) {
    case 1:
      return { fg: "#0d6b3c", bg: "#e6f6ee" };
    case 2:
      return { fg: "#0f766e", bg: "#f0fdfa" };
    case 3:
      return { fg: "#b45309", bg: "#fffbeb" };
    case 4:
      return { fg: "#c2410c", bg: "#fff3ed" };
    case 5:
      return { fg: "#c02626", bg: "#fdeaea" };
  }
}

/** Word for a severity score. Kept short — it sits beside "N/5", not instead. */
export function severityLabel(score: SeverityScore): string {
  switch (score) {
    case 1:
      return "Minimal";
    case 2:
      return "Minor";
    case 3:
      return "Moderate";
    case 4:
      return "Significant";
    case 5:
      return "Severe";
  }
}

export function intentTone(intent: LeadIntent): { fg: string; bg: string } {
  switch (intent) {
    case "estimate_viewed":
      return { fg: "#475569", bg: "#f1f5f9" };
    case "quote_requested":
      return { fg: "#0f766e", bg: "#f0fdfa" };
    case "callback_requested":
      return { fg: "#b45309", bg: "#fffbeb" };
  }
}

/** Whitespace and case vary between the geocoder's postcode and the one
 *  embedded in the formatted address ("HP13 6TS" vs "hp136ts"), so compare on
 *  a stripped, upper-cased form rather than a raw substring test. */
function normalisePostcode(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/**
 * The formatted address almost always already ends with the postcode, so
 * rendering both prints it twice. Returns the postcode only when the address
 * does NOT already contain it — otherwise null, and the caller omits the row.
 */
export function displayPostcode(
  addressFormatted: string | null | undefined,
  addressPostcode: string | null | undefined,
): string | null {
  const postcode = addressPostcode?.trim();
  if (!postcode) return null;
  const address = addressFormatted?.trim();
  if (!address) return postcode;
  return normalisePostcode(address).includes(normalisePostcode(postcode))
    ? null
    : postcode;
}

// ---------------------------------------------------------------------------
// leads.payload formatting
//
// Everything below renders "—" for null/undefined rather than substituting a
// plausible default. If the widget didn't capture it, the roofer sees a dash.
// ---------------------------------------------------------------------------

export const EMPTY = "—";

/** snake_case → "Snake case", for payload enums we have no explicit label for. */
function humanise(value: string): string {
  const spaced = value.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const MATERIAL_LABELS: Record<string, string> = {
  concrete_tile: "Concrete tile",
  clay_tile: "Clay tile",
  natural_slate: "Natural slate",
  fibre_cement: "Fibre cement",
  flat_bitumen: "Bitumen (flat)",
  flat_epdm: "EPDM rubber (flat)",
  flat_grp: "GRP fibreglass (flat)",
  polycarbonate: "Polycarbonate",
  glass_plain: "Plain glass",
  glass_laminated: "Laminated glass",
  felt: "Built-up felt",
  not_sure: "Not sure",
};

export function materialLabel(material: string | null | undefined): string {
  if (!material) return EMPTY;
  return MATERIAL_LABELS[material] ?? humanise(material);
}

/* Both of these mirror the wording the customer actually picked in the widget
   (PROPERTY_TYPE_OPTIONS / STOREY_OPTIONS in belpa-widget-frontend). Falling
   back to humanise() here loses the hyphen in "Semi-detached", and printing
   the storey band as a digit doesn't match what they were shown. */
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  detached: "Detached",
  semi_detached: "Semi-detached",
  end_of_terrace: "End of terrace",
  terraced: "Terraced",
  bungalow: "Bungalow",
  flat: "Flat",
};

export function propertyTypeLabel(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return PROPERTY_TYPE_LABELS[value] ?? humanise(value);
}

const STOREY_LABELS: Record<number, string> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four or more",
};

export function storeysLabel(value: number | null | undefined): string {
  if (!value) return EMPTY;
  return STOREY_LABELS[value] ?? String(value);
}

const CONDITION_LABELS: Record<ConditionAnswer, string> = {
  yes: "Reported damage or leaks",
  no: "No damage reported",
  not_sure: "Not sure",
};

export function conditionLabel(
  answer: ConditionAnswer | null | undefined,
): string {
  if (!answer) return EMPTY;
  return CONDITION_LABELS[answer] ?? humanise(answer);
}

const ROOFLINE_SCOPE_LABELS: Record<RooflineScope, string> = {
  gutters_only: "Gutters only",
  gutters_fascias: "Gutters & fascias",
};

export function rooflineScopeLabel(
  scope: RooflineScope | null | undefined,
): string {
  if (!scope) return EMPTY;
  return ROOFLINE_SCOPE_LABELS[scope] ?? humanise(scope);
}

export function roofTypeLabel(type: string | null | undefined): string {
  return type ? humanise(type) : EMPTY;
}

/** Free-text-ish payload enums (measurement method, imagery quality). */
export function payloadLabel(value: string | null | undefined): string {
  return value ? humanise(value) : EMPTY;
}

export function formatArea(m2: number | null | undefined): string {
  if (m2 == null || !Number.isFinite(m2)) return EMPTY;
  return `${Math.round(m2)} m²`;
}

export function formatLength(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return EMPTY;
  return `${m.toFixed(1)} m`;
}

export function formatPitch(degrees: number | null | undefined): string {
  if (degrees == null || !Number.isFinite(degrees)) return EMPTY;
  return `${Math.round(degrees)}°`;
}

export function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EMPTY;
  return String(n);
}

/** Date-only, for imagery capture dates which carry no meaningful time. */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
}

/**
 * Build a wa.me link from a UK / international phone number.
 * Strips a leading `00` international prefix before the UK `0→44` rewrite so
 * `00447…` becomes `447…`, not `440447…`.
 */
export function whatsappLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

/** Strict tel: — digits/spaces/punctuation only; no DTMF pause/wait chars. */
export function isSafeTelHref(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed || trimmed.length > 24) return false;
  if (/[,#*]/.test(trimmed)) return false;
  return /^\+?[0-9()\s.-]{7,24}$/.test(trimmed);
}

/** Strict mailto: — no query-string injection (?cc=&body=). */
export function isSafeMailtoHref(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  if (/[?]/.test(trimmed)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
