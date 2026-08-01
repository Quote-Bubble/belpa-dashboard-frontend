import type {
  DashboardLead,
  JobType,
  LeadIntent,
  LeadStatus,
} from "@/lib/types";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

const VALID_INTENTS: readonly LeadIntent[] = [
  "estimate_viewed",
  "quote_requested",
  "callback_requested",
];

/** Columns needed for Quotes / Jobs list rows (payload is loaded on expand). */
export const LEAD_LIST_COLUMNS =
  "id,status,intent,lead_type,job_type,contact_name,contact_phone,contact_email,address_formatted,address_postcode,quote_min_ex_vat,quote_max_ex_vat,actual_price_ex_vat,received_at,archived";

export type LeadRow = {
  id: string;
  status: LeadStatus;
  intent: string | null;
  lead_type: string | null;
  job_type: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address_formatted: string | null;
  address_postcode: string | null;
  quote_min_ex_vat: number | null;
  quote_max_ex_vat: number | null;
  actual_price_ex_vat: number | null;
  received_at: string;
  archived: boolean;
};

/** Map a persisted lead row to the dashboard view model. */
export function mapLeadRow(row: LeadRow): DashboardLead {
  return {
    id: row.id,
    status: row.status,
    // Older rows (pre-tiering) have no intent — treat them as plain priced.
    intent: (VALID_INTENTS as readonly string[]).includes(row.intent ?? "")
      ? (row.intent as LeadIntent)
      : "estimate_viewed",
    leadType:
      row.lead_type === "manual_consultation" ? "manual_consultation" : "quote",
    jobType: (row.job_type as JobType) ?? "other",
    contactName: row.contact_name ?? "Unknown",
    contactPhone: row.contact_phone ?? "",
    contactEmail: row.contact_email,
    addressFormatted: row.address_formatted ?? "",
    addressPostcode: row.address_postcode ?? "",
    quoteMinExVat: row.quote_min_ex_vat,
    quoteMaxExVat: row.quote_max_ex_vat,
    actualPriceExVat: row.actual_price_ex_vat,
    receivedAt: row.received_at,
    archived: row.archived,
  };
}

export function parsePageSize(raw: string | undefined): number {
  const n = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : 25;
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
