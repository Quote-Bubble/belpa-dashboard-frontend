import type { SupabaseClient } from "@supabase/supabase-js";

import type { LeadStatus } from "@/lib/types";

/** Inbox filter keys — mirrors QuotesClient pills. */
export type LeadStatusFilter =
  | "all"
  | LeadStatus
  | "followup"
  | "archived";

/** Jobs inbox filter keys — mirrors JobsClient pills. */
export type JobsStatusFilter = "all" | "priced" | "unpriced" | "archived";

const STATUSES: readonly LeadStatus[] = ["new", "contacted", "won", "lost"];

export function parseStatusFilter(
  raw: string | undefined,
): LeadStatusFilter {
  if (!raw || raw === "all") return "all";
  if (raw === "followup" || raw === "archived") return raw;
  if ((STATUSES as readonly string[]).includes(raw)) return raw as LeadStatus;
  return "all";
}

export function parseJobsStatusFilter(
  raw: string | undefined,
): JobsStatusFilter {
  if (raw === "priced" || raw === "unpriced" || raw === "archived") return raw;
  return "all";
}

export function parseSearchQuery(raw: string | undefined): string {
  return (raw ?? "").trim().slice(0, 80);
}

export type LeadFilterCounts = Record<LeadStatusFilter, number>;
export type JobsFilterCounts = Record<JobsStatusFilter, number>;

export function emptyFilterCounts(): LeadFilterCounts {
  return {
    all: 0,
    new: 0,
    contacted: 0,
    won: 0,
    lost: 0,
    followup: 0,
    archived: 0,
  };
}

export function emptyJobsFilterCounts(): JobsFilterCounts {
  return { all: 0, priced: 0, unpriced: 0, archived: 0 };
}

type FilterOpts = {
  rooferId?: string;
  status: LeadStatusFilter;
  q: string;
  /** Jobs list: only won rows. */
  wonOnly?: boolean;
  /** Jobs sub-filter when wonOnly (priced / unpriced / archived). */
  jobsStatus?: JobsStatusFilter;
  /** Count-only query (no rows returned). */
  head?: boolean;
};

/** eslint-disable @typescript-eslint/no-explicit-any — Supabase builder typing is heavy. */
function scopeRoofer(query: any, rooferId?: string) {
  return rooferId ? query.eq("roofer_id", rooferId) : query;
}

function applySearch(query: any, q: string) {
  const term = q.replace(/[%_,.()]/g, "").trim();
  if (!term) return query;
  const p = `%${term}%`;
  return query.or(
    `contact_name.ilike.${p},address_postcode.ilike.${p},address_formatted.ilike.${p}`,
  );
}

/**
 * Build a filtered leads list query. Genuine requests are quote_requested /
 * callback_requested; estimate_viewed (and null) are Follow-up browsers.
 */
export function buildLeadListQuery(
  supabase: SupabaseClient,
  columns: string,
  opts: FilterOpts,
) {
  let query = supabase
    .from("leads")
    .select(columns, { count: "exact", head: opts.head === true });
  query = scopeRoofer(query, opts.rooferId);

  if (opts.wonOnly) {
    const jobsStatus = opts.jobsStatus ?? "all";
    if (jobsStatus === "archived") {
      query = query.eq("status", "won").eq("archived", true);
    } else {
      query = query.eq("status", "won").eq("archived", false);
      if (jobsStatus === "priced") {
        query = query.not("actual_price_ex_vat", "is", null);
      } else if (jobsStatus === "unpriced") {
        query = query.is("actual_price_ex_vat", null);
      }
    }
    return applySearch(query, opts.q);
  }

  if (opts.status === "archived") {
    query = query.eq("archived", true);
  } else if (opts.status === "followup") {
    query = query
      .eq("archived", false)
      .or("intent.is.null,intent.eq.estimate_viewed");
  } else {
    query = query
      .eq("archived", false)
      .in("intent", ["quote_requested", "callback_requested"]);
    if (opts.status !== "all") {
      query = query.eq("status", opts.status);
    }
  }

  return applySearch(query, opts.q);
}

/** Parallel head-counts for each inbox pill (current filter search applied). */
export async function fetchLeadFilterCounts(
  supabase: SupabaseClient,
  opts: { rooferId?: string; q: string },
): Promise<LeadFilterCounts> {
  const bases: LeadStatusFilter[] = [
    "all",
    "new",
    "contacted",
    "won",
    "lost",
    "followup",
    "archived",
  ];
  const results = await Promise.all(
    bases.map(async (status) => {
      const { count } = await buildLeadListQuery(supabase, "id", {
        rooferId: opts.rooferId,
        status,
        q: opts.q,
        head: true,
      });
      return [status, count ?? 0] as const;
    }),
  );
  const out = emptyFilterCounts();
  for (const [k, v] of results) out[k] = v;
  return out;
}

/** Parallel head-counts for Jobs pills. */
export async function fetchJobsFilterCounts(
  supabase: SupabaseClient,
  opts: { rooferId?: string; q: string },
): Promise<JobsFilterCounts> {
  const bases: JobsStatusFilter[] = [
    "all",
    "priced",
    "unpriced",
    "archived",
  ];
  const results = await Promise.all(
    bases.map(async (jobsStatus) => {
      const { count } = await buildLeadListQuery(supabase, "id", {
        rooferId: opts.rooferId,
        status: "all",
        jobsStatus,
        q: opts.q,
        wonOnly: true,
        head: true,
      });
      return [jobsStatus, count ?? 0] as const;
    }),
  );
  const out = emptyJobsFilterCounts();
  for (const [k, v] of results) out[k] = v;
  return out;
}
