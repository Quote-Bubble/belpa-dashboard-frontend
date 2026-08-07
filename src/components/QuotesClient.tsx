"use client";

import { Archive, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type {
  DashboardLead,
  LeadPayload,
  LeadPayloadState,
  LeadStatus,
} from "@/lib/types";
import type { LeadFilterCounts, LeadStatusFilter } from "@/lib/lead-filters";
import { jobTypeLabel, statusLabel, STATUS_ORDER } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { revalidateAnalytics } from "@/lib/actions";
import PageHeader from "@/components/PageHeader";
import FilterBar, { type Filter } from "@/components/FilterBar";
import QuotesTable, {
  type SortDir,
  type SortKey,
} from "@/components/QuotesTable";
import CompleteQuoteModal from "@/components/CompleteQuoteModal";

/** Pill colours per filter: `ink` idle text, `solid` bubble colour. */
const FILTER_COLORS: Record<LeadStatusFilter, { ink: string; solid: string }> = {
  all: { ink: "#3d4148", solid: "#0a0b0d" },
  new: { ink: "#1546c9", solid: "#2f6bff" },
  contacted: { ink: "#6d28d9", solid: "#7c3aed" },
  won: { ink: "#0d6b3c", solid: "#12915a" },
  lost: { ink: "#c02626", solid: "#dc2626" },
  followup: { ink: "#475569", solid: "#64748b" },
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
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "receivedAt":
      return (
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );
  }
}

export default function QuotesClient({
  initialLeads,
  rooferSlug,
  page,
  pageSize,
  totalCount,
  statusFilter,
  searchQuery,
  filterCounts,
  hideHeader = false,
}: {
  initialLeads: DashboardLead[];
  rooferSlug: string;
  page: number;
  pageSize: number;
  totalCount: number;
  statusFilter: LeadStatusFilter;
  searchQuery: string;
  filterCounts: LeadFilterCounts;
  /** When embedded in the admin roofer hub (title lives on the hub). */
  hideHeader?: boolean;
}) {
  const [leads, setLeads] = useState<DashboardLead[]>(initialLeads);
  const [search, setSearch] = useState(searchQuery);
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flashWonId, setFlashWonId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<DashboardLead | null>(null);
  const flashTimer = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  // Debounce search → URL so the server filters the full inbox.
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

  const syncAnalytics = () => {
    void revalidateAnalytics().then(() => router.prefetch("/analytics"));
  };

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

  const [payloads, setPayloads] = useState<Record<string, LeadPayloadState>>({});
  const requested = useRef<Set<string>>(new Set());

  // Server already filtered; client only sorts the current page.
  const visible = useMemo(() => {
    return [...leads].sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [leads, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "contactName" || key === "jobType" ? "asc" : "desc");
    }
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    if (status === "won") {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        setCompleting(lead);
        return;
      }
    }
    applyStatus(id, status);
  };

  const applyStatus = (
    id: string,
    status: LeadStatus,
    actualPrice?: number | null,
  ) => {
    const prevStatus = leads.find((l) => l.id === id)?.status;
    setMutationError(null);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    if (status === "won") {
      setFlashWonId(id);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashWonId(null), 650);
    }
    const update =
      actualPrice != null
        ? { status, actual_price_ex_vat: actualPrice }
        : { status };
    void createClient()
      .from("leads")
      .update(update)
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setMutationError("Couldn’t update status. Please try again.");
          if (prevStatus !== undefined) {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === id && l.status === status
                  ? { ...l, status: prevStatus }
                  : l,
              ),
            );
          }
        } else {
          syncAnalytics();
          router.refresh();
        }
      });
  };

  const commitCompletion = (actualPrice: number | null) => {
    if (!completing) return;
    const id = completing.id;
    setCompleting(null);
    applyStatus(id, "won", actualPrice);
  };

  const handleArchive = (id: string) => {
    const prevArchived = leads.find((l) => l.id === id)?.archived ?? false;
    const nextArchived = !prevArchived;
    setMutationError(null);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, archived: nextArchived } : l)),
    );
    setExpandedId((cur) => (cur === id ? null : cur));

    void createClient()
      .from("leads")
      .update({ archived: nextArchived })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          setMutationError("Couldn’t update archive state. Please try again.");
          setLeads((prev) =>
            prev.map((l) =>
              l.id === id && l.archived === nextArchived
                ? { ...l, archived: prevArchived }
                : l,
            ),
          );
        } else {
          syncAnalytics();
          router.refresh();
        }
      });
  };

  const loadPayload = (id: string) => {
    if (requested.current.has(id)) return;
    requested.current.add(id);
    setPayloads((p) => ({
      ...p,
      [id]: { data: null, loading: true, error: null },
    }));

    void createClient()
      .from("leads")
      .select("payload")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          requested.current.delete(id);
          setPayloads((p) => ({
            ...p,
            [id]: { data: null, loading: false, error: error.message },
          }));
          return;
        }
        setPayloads((p) => ({
          ...p,
          [id]: {
            data: (data?.payload ?? null) as LeadPayload | null,
            loading: false,
            error: null,
          },
        }));
      });
  };

  const handleToggle = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
    loadPayload(id);
  };

  const order: LeadStatusFilter[] = [
    "all",
    ...STATUS_ORDER,
    "followup",
    "archived",
  ];
  const filterLabel = (f: LeadStatusFilter) =>
    f === "all"
      ? "All"
      : f === "archived"
        ? "Archived"
        : f === "followup"
          ? "Follow-up"
          : statusLabel(f);
  const archiveIcon = (
    <Archive size={16} strokeWidth={2} aria-hidden />
  );
  const filterItems: Filter[] = order.map((f) => ({
    key: f,
    label: filterLabel(f),
    count: filterCounts[f],
    ink: FILTER_COLORS[f].ink,
    solid: FILTER_COLORS[f].solid,
    icon: f === "archived" ? archiveIcon : undefined,
  }));

  return (
    <>
      {hideHeader ? null : <PageHeader title="Quotes" />}

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
          activeKey={statusFilter}
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
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>

      <QuotesTable
        key={`${statusFilter}-${safePage}-${pageSize}-${searchQuery}`}
        leads={visible}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onToggle={handleToggle}
        expandedId={expandedId}
        payloads={payloads}
        onStatusChange={handleStatusChange}
        onArchive={handleArchive}
        archivedView={statusFilter === "archived"}
        noLeadsAtAll={totalCount === 0 && !searchQuery && statusFilter === "all"}
        rooferSlug={rooferSlug}
        flashWonId={flashWonId}
        newId={null}
        page={safePage}
        pageSize={pageSize}
        pageCount={pageCount}
        totalCount={totalCount}
        onPageChange={(p) => navigatePage(p)}
        onPageSizeChange={(size) => navigatePage(0, size)}
      />

      {completing ? (
        <CompleteQuoteModal
          lead={completing}
          onConfirm={commitCompletion}
          onCancel={() => setCompleting(null)}
        />
      ) : null}
    </>
  );
}
