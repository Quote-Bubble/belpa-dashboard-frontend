"use client";

import { Archive, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type {
  DashboardLead,
  LeadPayload,
  LeadPayloadState,
} from "@/lib/types";
import type { JobsFilterCounts, JobsStatusFilter } from "@/lib/lead-filters";
import { jobTypeLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import FilterBar, { type Filter } from "@/components/FilterBar";
import JobsTable, { type SortDir, type SortKey } from "@/components/JobsTable";

const FILTER_COLORS: Record<JobsStatusFilter, { ink: string; solid: string }> = {
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
    case "address":
      return (a.addressFormatted || a.addressPostcode || "").localeCompare(
        b.addressFormatted || b.addressPostcode || "",
      );
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
  jobsFilter,
  searchQuery,
  filterCounts,
  hideHeader = false,
}: {
  initialJobs: DashboardLead[];
  page: number;
  pageSize: number;
  totalCount: number;
  jobsFilter: JobsStatusFilter;
  searchQuery: string;
  filterCounts: JobsFilterCounts;
  /** When embedded in the admin roofer hub (title lives on the hub). */
  hideHeader?: boolean;
}) {
  const [jobs, setJobs] = useState<DashboardLead[]>(initialJobs);
  const [search, setSearch] = useState(searchQuery);
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [payloads, setPayloads] = useState<Record<string, LeadPayloadState>>({});
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === searchQuery) return;
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.set("page", "0");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search, searchQuery, pathname, router, searchParams]);

  const navigate = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const navigatePage = (nextPage: number, nextSize = pageSize) => {
    navigate({
      page: String(Math.max(0, nextPage)),
      pageSize: String(nextSize),
    });
  };

  const visible = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [jobs, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "contactName" || key === "jobType" || key === "address"
          ? "asc"
          : "desc",
      );
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
        } else {
          router.refresh();
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
    <Archive size={16} strokeWidth={2} aria-hidden />
  );

  const filterOrder: JobsStatusFilter[] = [
    "all",
    "priced",
    "unpriced",
    "archived",
  ];
  const filterLabel = (f: JobsStatusFilter) => {
    if (f === "all") return "All";
    if (f === "priced") return "Priced";
    if (f === "unpriced") return "Unpriced";
    return "Archived";
  };
  const filterItems: Filter[] = filterOrder.map((f) => ({
    key: f,
    label: filterLabel(f),
    count: filterCounts[f],
    ink: FILTER_COLORS[f].ink,
    solid: FILTER_COLORS[f].solid,
    icon: f === "archived" ? archiveIcon : undefined,
  }));

  return (
    <>
      {hideHeader ? null : <PageHeader title="Jobs" />}

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
          onSelect={(k) =>
            navigate({
              status: k === "all" ? null : k,
              page: "0",
            })
          }
        />

        <label className="search-box field flex items-center gap-2 px-3 py-2 sm:w-64">
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or postcode"
            className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted sm:text-sm"
          />
        </label>
      </div>

      <JobsTable
        key={`${jobsFilter}-${safePage}-${pageSize}-${searchQuery}`}
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
        noJobsAtAll={totalCount === 0 && !searchQuery && jobsFilter === "all"}
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
