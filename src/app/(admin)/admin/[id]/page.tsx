import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import DeployStatusControl from "@/components/admin/DeployStatusControl";
import RooferHubTabs, {
  type RooferHubTab,
} from "@/components/admin/RooferHubTabs";
import RooferMoreMenu from "@/components/admin/RooferMoreMenu";
import RooferPanel from "@/components/admin/RooferPanel";
import PricingPageClient from "@/components/PricingPageClient";
import QuotesClient from "@/components/QuotesClient";
import JobsClient from "@/components/JobsClient";
import { createClient } from "@/lib/supabase/server";
import { linkRooferLogin, updateRoofer } from "@/lib/admin-actions";
import { getQuoteConfig } from "@/lib/pricing";
import { assessCompleteness } from "@/lib/quote-config";
import {
  LEAD_LIST_COLUMNS,
  mapLeadRow,
  parsePage,
  parsePageSize,
  type LeadRow,
} from "@/lib/leads";
import {
  buildLeadListQuery,
  fetchJobsFilterCounts,
  fetchLeadFilterCounts,
  parseJobsStatusFilter,
  parseSearchQuery,
  parseStatusFilter,
  type JobsFilterCounts,
  type LeadFilterCounts,
} from "@/lib/lead-filters";
import {
  buttonSnippet,
  hostedLink,
  previewButton,
  previewWidget,
  widgetSnippet,
} from "@/lib/embed-snippets";
import type { RooferAdminRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseTab(raw: string | undefined): RooferHubTab {
  if (raw === "jobs" || raw === "pricing" || raw === "setup") return raw;
  return "quotes";
}

export default async function RooferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const q = parseSearchQuery(sp.q);
  const statusFilter = parseStatusFilter(sp.status);
  const jobsFilter = parseJobsStatusFilter(sp.status);

  const supabase = await createClient();
  const { data } = await supabase
    .from("roofers")
    .select(
      "id,slug,name,website,contact_name,contact_phone,deploy_status,created_at,allowed_origins",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const roofer = data as RooferAdminRow & { allowed_origins?: string[] | null };
  const quoteConfig = await getQuoteConfig(roofer.id);
  const pricingCompleteness = assessCompleteness(quoteConfig);

  const [{ count: quoteCount }, { count: jobCount }] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("roofer_id", roofer.id),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("roofer_id", roofer.id)
      .eq("status", "won"),
  ]);

  let quotesBody: ReactNode = null;
  let jobsBody: ReactNode = null;
  let pricingBody: ReactNode = null;
  let setupBody: ReactNode = null;

  if (tab === "quotes" || tab === "jobs") {
    const pageSize = parsePageSize(sp.pageSize);
    let page = parsePage(sp.page);
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const query =
      tab === "jobs"
        ? buildLeadListQuery(supabase, LEAD_LIST_COLUMNS, {
            rooferId: roofer.id,
            status: "all",
            jobsStatus: jobsFilter,
            q,
            wonOnly: true,
          })
        : buildLeadListQuery(supabase, LEAD_LIST_COLUMNS, {
            rooferId: roofer.id,
            status: statusFilter,
            q,
          });

    const listResult = await query
      .order("received_at", { ascending: false })
      .range(from, to);
    const { data: leadData, error, count } = listResult;

    const loadError = (
      <div className="surface rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Couldn’t load {tab === "jobs" ? "jobs" : "quotes"}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Please refresh the page and try again.
        </p>
      </div>
    );

    if (error) {
      if (tab === "quotes") quotesBody = loadError;
      else jobsBody = loadError;
    } else {
      const totalCount = count ?? 0;
      const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
      if (page > pageCount - 1) page = pageCount - 1;
      const rows = ((leadData as LeadRow[] | null) ?? []).map(mapLeadRow);

      if (tab === "quotes") {
        const filterCounts: LeadFilterCounts = await fetchLeadFilterCounts(
          supabase,
          { rooferId: roofer.id, q },
        );
        quotesBody = (
          <Suspense fallback={null}>
            <QuotesClient
              initialLeads={rows}
              rooferSlug={roofer.slug}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              statusFilter={statusFilter}
              searchQuery={q}
              filterCounts={filterCounts}
              hideHeader
            />
          </Suspense>
        );
      } else {
        const filterCounts: JobsFilterCounts = await fetchJobsFilterCounts(
          supabase,
          { rooferId: roofer.id, q },
        );
        jobsBody = (
          <Suspense fallback={null}>
            <JobsClient
              initialJobs={rows}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              jobsFilter={jobsFilter}
              searchQuery={q}
              filterCounts={filterCounts}
              hideHeader
            />
          </Suspense>
        );
      }
    }
  }

  if (tab === "pricing") {
    pricingBody = (
      <PricingPageClient
        rooferId={roofer.id}
        initial={quoteConfig}
        allowedOrigins={roofer.allowed_origins ?? []}
        showOrigins
        previewUrl={hostedLink(roofer.slug)}
      />
    );
  }

  if (tab === "setup") {
    const { data: memberRows } = await supabase.rpc("admin_roofer_members", {
      p_roofer_id: roofer.id,
    });
    const members = (memberRows ?? []) as { email: string }[];

    setupBody = (
      <div className="mx-auto max-w-3xl">
        <RooferPanel
          rooferId={roofer.id}
          install={{
            slug: roofer.slug,
            button: buttonSnippet(roofer.slug),
            widget: widgetSnippet(roofer.slug),
            link: hostedLink(roofer.slug),
            preview: {
              button: previewButton(roofer.slug),
              widget: previewWidget(roofer.slug),
              link: hostedLink(roofer.slug),
            },
          }}
          details={{
            name: roofer.name,
            website: roofer.website ?? "",
            contactName: roofer.contact_name ?? "",
            contactPhone: roofer.contact_phone ?? "",
          }}
          members={members}
          updateAction={updateRoofer.bind(null, roofer.id)}
          linkAction={linkRooferLogin.bind(null, roofer.id)}
        />
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        ← Roofers
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {roofer.name}
        </h1>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <DeployStatusControl
            id={roofer.id}
            status={roofer.deploy_status}
            pricingReady={pricingCompleteness.ready}
            pricingWarning={
              pricingCompleteness.warnings[0] ??
              "Pricing isn’t complete yet. Mark live anyway?"
            }
          />
          <RooferMoreMenu id={roofer.id} name={roofer.name} />
        </div>
      </div>

      <RooferHubTabs
        rooferId={roofer.id}
        active={tab}
        quoteCount={quoteCount ?? 0}
        jobCount={jobCount ?? 0}
      />

      {tab === "quotes" && quotesBody}
      {tab === "jobs" && jobsBody}
      {tab === "pricing" && pricingBody}
      {tab === "setup" && setupBody}
    </div>
  );
}
