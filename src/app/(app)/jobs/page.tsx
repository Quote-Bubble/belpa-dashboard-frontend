import type {
  DashboardLead,
  JobType,
  LeadIntent,
  LeadStatus,
} from "@/lib/types";
import { createClient, getUser } from "@/lib/supabase/server";
import { getRoofer } from "@/lib/roofer";
import JobsClient from "@/components/JobsClient";
import PageHeader from "@/components/PageHeader";
import NotLinkedNotice from "@/components/NotLinkedNotice";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

const VALID_INTENTS: readonly LeadIntent[] = [
  "estimate_viewed",
  "quote_requested",
  "callback_requested",
];

type LeadRow = {
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

function mapRow(row: LeadRow): DashboardLead {
  return {
    id: row.id,
    status: row.status,
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

function parsePageSize(raw: string | undefined): number {
  const n = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : 25;
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const user = await getUser();
  const lookup = await getRoofer();

  if (lookup.status === "error") {
    return (
      <>
        <PageHeader title="Jobs" />
        <div className="surface rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Couldn’t load your account
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Please refresh the page and try again. If this keeps happening,
            contact support.
          </p>
        </div>
      </>
    );
  }

  if (lookup.status === "not_linked") {
    return (
      <>
        <PageHeader title="Jobs" />
        <NotLinkedNotice userId={user?.id ?? "unknown"} />
      </>
    );
  }

  const params = await searchParams;
  const pageSize = parsePageSize(params.pageSize);
  let page = parsePage(params.page);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  const jobsQuery = supabase
    .from("leads")
    .select(
      "id,status,intent,lead_type,job_type,contact_name,contact_phone,contact_email,address_formatted,address_postcode,quote_min_ex_vat,quote_max_ex_vat,actual_price_ex_vat,received_at,archived",
      { count: "exact" },
    )
    .eq("status", "won")
    .order("received_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await jobsQuery;

  if (error) {
    return (
      <>
        <PageHeader title="Jobs" />
        <div className="surface rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Couldn’t load your jobs
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Please refresh the page and try again. If this keeps happening,
            contact support.
          </p>
        </div>
      </>
    );
  }

  const totalCount = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  if (page > pageCount - 1) page = pageCount - 1;

  const jobs = ((data as LeadRow[] | null) ?? []).map(mapRow);

  return (
    <JobsClient
      initialJobs={jobs}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
    />
  );
}
