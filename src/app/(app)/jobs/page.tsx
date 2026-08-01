import { createClient, getUser } from "@/lib/supabase/server";
import { getRoofer } from "@/lib/roofer";
import {
  LEAD_LIST_COLUMNS,
  mapLeadRow,
  parsePage,
  parsePageSize,
  type LeadRow,
} from "@/lib/leads";
import JobsClient from "@/components/JobsClient";
import PageHeader from "@/components/PageHeader";
import NotLinkedNotice from "@/components/NotLinkedNotice";

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

  const { data, error, count } = await supabase
    .from("leads")
    .select(LEAD_LIST_COLUMNS, { count: "exact" })
    .eq("status", "won")
    .order("received_at", { ascending: false })
    .range(from, to);

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

  const jobs = ((data as LeadRow[] | null) ?? []).map(mapLeadRow);

  return (
    <JobsClient
      initialJobs={jobs}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
    />
  );
}
