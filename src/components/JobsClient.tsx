"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { DashboardLead } from "@/lib/types";
import { jobTypeLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { computeJobStats } from "@/lib/job-stats";
import PageHeader from "@/components/PageHeader";
import JobStats from "@/components/JobStats";
import JobsTable, { type SortDir, type SortKey } from "@/components/JobsTable";

function compare(a: DashboardLead, b: DashboardLead, key: SortKey): number {
  switch (key) {
    case "contactName":
      return a.contactName.localeCompare(b.contactName);
    case "jobType":
      return jobTypeLabel(a.jobType).localeCompare(jobTypeLabel(b.jobType));
    case "quote": {
      const aq = a.quoteMaxExVat;
      const bq = b.quoteMaxExVat;
      if (aq == null && bq == null) return 0;
      if (aq == null) return 1;
      if (bq == null) return -1;
      return aq - bq;
    }
    case "actualPrice": {
      const aq = a.actualPriceExVat;
      const bq = b.actualPriceExVat;
      if (aq == null && bq == null) return 0;
      if (aq == null) return 1;
      if (bq == null) return -1;
      return aq - bq;
    }
    case "receivedAt":
      return (
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );
  }
}

export default function JobsClient({
  initialJobs,
  page,
  pageSize,
  totalCount,
  totalNonArchivedLeads,
}: {
  initialJobs: DashboardLead[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalNonArchivedLeads: number;
}) {
  const [jobs, setJobs] = useState<DashboardLead[]>(initialJobs);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const navigatePage = (nextPage: number, nextSize = pageSize) => {
    const params = new URLSearchParams();
    params.set("page", String(Math.max(0, nextPage)));
    params.set("pageSize", String(nextSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = jobs.filter((j) => !j.archived);
    if (q) {
      rows = rows.filter(
        (j) =>
          j.contactName.toLowerCase().includes(q) ||
          j.addressPostcode.toLowerCase().includes(q) ||
          j.addressFormatted.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) => compare(a, b, sortKey));
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [jobs, search, sortKey, sortDir]);

  const stats = useMemo(
    () => computeJobStats(visible, totalNonArchivedLeads),
    [visible, totalNonArchivedLeads],
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "contactName" || key === "jobType" ? "asc" : "desc");
    }
  };

  const handlePriceChange = (id: string, value: number | null) => {
    const prev = jobs.find((j) => j.id === id)?.actualPriceExVat ?? null;
    setMutationError(null);
    setJobs((list) =>
      list.map((j) => (j.id === id ? { ...j, actualPriceExVat: value } : j)),
    );
    void createClient()
      .from("leads")
      .update({ actual_price_ex_vat: value })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setMutationError("Couldn’t save the price. Please try again.");
          setJobs((list) =>
            list.map((j) =>
              j.id === id && j.actualPriceExVat === value
                ? { ...j, actualPriceExVat: prev }
                : j,
            ),
          );
        }
      });
  };

  const handleArchive = (id: string) => {
    setMutationError(null);
    setJobs((list) =>
      list.map((j) => (j.id === id ? { ...j, archived: true } : j)),
    );
    void createClient()
      .from("leads")
      .update({ archived: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setMutationError("Couldn’t archive that job. Please try again.");
          setJobs((list) =>
            list.map((j) =>
              j.id === id && j.archived ? { ...j, archived: false } : j,
            ),
          );
        } else {
          router.refresh();
        }
      });
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Won work — log the final price and see how it compares to our estimate."
      />

      {mutationError ? (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{mutationError}</span>
          <button
            type="button"
            onClick={() => setMutationError(null)}
            className="shrink-0 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <JobStats stats={stats} />

      <div className="toolbar mb-5 flex flex-col gap-3 rounded-2xl p-2 sm:flex-row sm:items-center sm:justify-end">
        <label className="search-box field flex items-center gap-2 px-3 py-2 sm:w-64">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-muted"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or postcode"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>

      <JobsTable
        jobs={visible}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onArchive={handleArchive}
        onPriceChange={handlePriceChange}
        noJobsAtAll={totalCount === 0}
        page={safePage}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={(p) => navigatePage(p)}
        onPageSizeChange={(size) => navigatePage(0, size)}
      />
    </>
  );
}
