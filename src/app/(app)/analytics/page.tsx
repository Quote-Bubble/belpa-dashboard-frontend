import { createClient, getUser } from "@/lib/supabase/server";
import { getRoofer } from "@/lib/roofer";
import { quoteValue, type QuoteStat } from "@/lib/analytics";
import type { JobType, LeadStatus } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import NotLinkedNotice from "@/components/NotLinkedNotice";
import AnalyticsClient from "@/components/AnalyticsClient";

type LeadRow = {
  status: LeadStatus;
  job_type: string | null;
  quote_min_ex_vat: number | null;
  quote_max_ex_vat: number | null;
  received_at: string;
};

// Same reasoning as Quotes: aggregates shift as new leads come in, so this
// isn't a candidate for static caching.
export const dynamic = "force-dynamic";

/** Charts only cover ≤90 days — don't pull unbounded historical rows (or PII). */
const ANALYTICS_WINDOW_DAYS = 90;
/** Hard cap so PostgREST truncation can't silently skew aggregates forever. */
const ANALYTICS_ROW_CAP = 5_000;

export default async function AnalyticsPage() {
  const user = await getUser();
  const lookup = await getRoofer();

  if (lookup.status === "error") {
    return (
      <>
        <PageHeader title="Analytics" />
        <div className="surface rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Couldn’t load your analytics
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
        <PageHeader title="Analytics" />
        <NotLinkedNotice userId={user?.id ?? "unknown"} />
      </>
    );
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - ANALYTICS_WINDOW_DAYS);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    // Non-PII columns only — never ship name/phone/email/address into analytics.
    .select("status,job_type,quote_min_ex_vat,quote_max_ex_vat,received_at")
    .eq("archived", false)
    .gte("received_at", since.toISOString())
    .order("received_at", { ascending: false })
    .limit(ANALYTICS_ROW_CAP);

  if (error) {
    return (
      <>
        <PageHeader title="Analytics" />
        <div className="surface rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Couldn’t load your analytics
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Please refresh the page and try again. If this keeps happening,
            contact support.
          </p>
        </div>
      </>
    );
  }

  const stats: QuoteStat[] = ((data as LeadRow[] | null) ?? []).map((row) => ({
    receivedAt: row.received_at,
    value: quoteValue(row.quote_min_ex_vat, row.quote_max_ex_vat),
    status: row.status,
    jobType: (row.job_type as JobType) ?? "other",
  }));

  return <AnalyticsClient stats={stats} />;
}
