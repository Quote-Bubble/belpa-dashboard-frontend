"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type {
  DashboardLead,
  LeadPayload,
  LeadPayloadState,
} from "@/lib/types";
import { jobTypeLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import FilterBar, { type Filter } from "@/components/FilterBar";
import JobsTable, { type SortDir, type SortKey } from "@/components/JobsTable";

type JobsFilter = "all" | "priced" | "unpriced" | "archived";

const FILTER_COLORS: Record<JobsFilter, { ink: string; solid: string }> = {
  all: { ink: "#3d4148", solid: "#0a0b0d" },
  priced: { ink: "#0d6b3c", solid: "#12915a" },
  unpriced: { ink: "#1546c9", solid: "#2f6bff" },
  archived: { ink: "#9a6510", solid: "#d99a17" },
};

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
}: {
  initialJobs: DashboardLead[];
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const [jobs, setJobs] = useState<DashboardLead[]>(initialJobs);
  const [jobsFilter, setJobsFilter] = useState<JobsFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [payloads, setPayloads] = useState<Record<string, LeadPayloadState>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const navigatePage = (nextPage: number, nextSize = pageSize) => {
    const params = new URLSearchParams();
    params.set("page", String(Math.max(0, nextPage)));
    params.set("pageSize", String(nextSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  const counts = useMemo(() => {
    const c: Record<JobsFilter, number> = {
      all: 0,
      priced: 0,
      unpriced: 0,
      archived: 0,
    };
    for (const j of jobs) {
      if (j.archived) {
        c.archived += 1;
        continue;
      }
      c.all += 1;
      if (j.actualPriceExVat != null) c.priced += 1;
      else c.unpriced += 1;
    }
    return c;
  }, [jobs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const archivedView = jobsFilter === "archived";
    const filtered = jobs.filter((j) => {
      if (archivedView) {
        if (!j.archived) return false;
      } else if (j.archived) {
        return false;
      } else if (jobsFilter === "priced") {
        if (j.actualPriceExVat == null) return false;
      } else if (jobsFilter === "unpriced") {
        if (j.actualPriceExVat != null) return false;
      }
      if (!q) return true;
      return (
        j.contactName.toLowerCase().includes(q) ||
        j.addressPostcode.toLowerCase().includes(q) ||
        j.addressFormatted.toLowerCase().includes(q) ||
        j.contactPhone.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [jobs, jobsFilter, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "contactName" || key === "jobType" ? "asc" : "desc");
    }
  };

  const handleToggle = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
    if (requested.current.has(id)) return;
    requested.current.add(id);
    setPayloads((prev) => ({
      ...prev,
      [id]: { data: null, loading: true, error: null },
    }));
    void createClient()
      .from("leads")
      .select("payload")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setPayloads((prev) => ({
            ...prev,
            [id]: {
              data: null,
              loading: false,
              error: "Couldn’t load job details.",
            },
          }));
          return;
        }
        setPayloads((prev) => ({
          ...prev,
          [id]: {
            data: (data?.payload as LeadPayload | null) ?? null,
            loading: false,
            error: null,
          },
        }));
      });
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
    const current = jobs.find((j) => j.id === id);
    if (!current) return;
    const nextArchived = !current.archived;
    setMutationError(null);
    setJobs((list) =>
      list.map((j) => (j.id === id ? { ...j, archived: nextArchived } : j)),
    );
    if (expandedId === id) setExpandedId(null);
    void createClient()
      .from("leads")
      .update({ archived: nextArchived })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setMutationError(
            nextArchived
              ? "Couldn’t archive that job. Please try again."
              : "Couldn’t restore that job. Please try again.",
          );
          setJobs((list) =>
            list.map((j) =>
              j.id === id ? { ...j, archived: current.archived } : j,
            ),
          );
        } else {
          router.refresh();
        }
      });
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  const archiveIcon = (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Archived"
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  );

  const filterOrder: JobsFilter[] = ["all", "priced", "unpriced", "archived"];
  const filterLabel = (f: JobsFilter) => {
    if (f === "all") return "All";
    if (f === "priced") return "Priced";
    if (f === "unpriced") return "Unpriced";
    return "Archived";
  };
  const filterItems: Filter[] = filterOrder.map((f) => ({
    key: f,
    label: filterLabel(f),
    count: counts[f],
    ink: FILTER_COLORS[f].ink,
    solid: FILTER_COLORS[f].solid,
    icon: f === "archived" ? archiveIcon : undefined,
  }));

  return (
    <>
      <PageHeader title="Jobs" />

      {mutationError && (
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
      )}

      <div className="toolbar mb-5 flex flex-col gap-3 rounded-2xl p-2 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar
          filters={filterItems}
          activeKey={jobsFilter}
          onSelect={(k) => setJobsFilter(k as JobsFilter)}
        />

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
        key={`${jobsFilter}-${safePage}-${pageSize}`}
        jobs={visible}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onToggle={handleToggle}
        expandedId={expandedId}
        payloads={payloads}
        onArchive={handleArchive}
        onPriceChange={handlePriceChange}
        archivedView={jobsFilter === "archived"}
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
