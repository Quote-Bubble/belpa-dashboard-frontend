"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import type {
  DashboardLead,
  LeadPayload,
  LeadPayloadState,
  LeadStatus,
} from "@/lib/types";
import { jobTypeLabel, statusLabel, STATUS_ORDER } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { revalidateAnalytics } from "@/lib/actions";
import PageHeader from "@/components/PageHeader";
import QuotesJobsSwitcher from "@/components/QuotesJobsSwitcher";
import FilterBar, { type Filter } from "@/components/FilterBar";
import QuotesTable, {
  type SortDir,
  type SortKey,
} from "@/components/QuotesTable";

// "followup" isn't a status — it's the estimate-only browsers (intent
// `estimate_viewed`) who never asked to proceed. They're kept out of the main
// views (which show genuine requests) and parked here for nurture.
type StatusFilter = "all" | LeadStatus | "followup" | "archived";

/** A confirmed lead actually asked to be contacted; a browser only priced. */
function isBrowser(lead: DashboardLead): boolean {
  return lead.intent === "estimate_viewed";
}

/** Pill colours per filter: `ink` idle text, `solid` bubble colour. */
const FILTER_COLORS: Record<StatusFilter, { ink: string; solid: string }> = {
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
      // Null quotes always sort last, regardless of direction.
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
}: {
  initialLeads: DashboardLead[];
  rooferSlug: string;
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const [leads, setLeads] = useState<DashboardLead[]>(initialLeads);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flashWonId, setFlashWonId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Sync when the server re-renders a new page of leads.
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  // Quotes writes go straight to Supabase for instant optimistic UI, which
  // bypasses Next's cache — so Analytics silently kept stale numbers until a
  // manual refresh. Invalidate its cached copy, then eagerly re-fetch it in
  // the background so it's already warm by the time you actually click over.
  const syncAnalytics = () => {
    void revalidateAnalytics().then(() => router.prefetch("/analytics"));
  };

  const navigatePage = (nextPage: number, nextSize = pageSize) => {
    const params = new URLSearchParams();
    params.set("page", String(Math.max(0, nextPage)));
    params.set("pageSize", String(nextSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  // `payload` is a fat jsonb column (roof segments, per-segment contributions),
  // so it's fetched per lead on expand rather than in the list query.
  const [payloads, setPayloads] = useState<Record<string, LeadPayloadState>>({});
  const requested = useRef<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: 0,
      new: 0,
      contacted: 0,
      won: 0,
      lost: 0,
      followup: 0,
      archived: 0,
    };
    for (const l of leads) {
      if (l.archived) c.archived += 1;
      else if (isBrowser(l)) c.followup += 1;
      else {
        c.all += 1;
        c[l.status] += 1;
      }
    }
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const archivedView = statusFilter === "archived";
    const followupView = statusFilter === "followup";
    const filtered = leads.filter((l) => {
      if (archivedView) {
        if (!l.archived) return false;
      } else if (l.archived) {
        return false;
      } else if (followupView) {
        // Follow-up tab: only the estimate-only browsers.
        if (!isBrowser(l)) return false;
      } else {
        // Main views: genuine requests only — a browser stays hidden until
        // they come back and actually ask (which promotes their intent).
        if (isBrowser(l)) return false;
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        l.contactName.toLowerCase().includes(q) ||
        l.addressPostcode.toLowerCase().includes(q) ||
        l.addressFormatted.toLowerCase().includes(q)
      );
    });
    // Multiply by direction instead of reverse() so ties keep stable order.
    return [...filtered].sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [leads, statusFilter, search, sortKey, sortDir]);

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
    const prevStatus = leads.find((l) => l.id === id)?.status;
    setMutationError(null);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    if (status === "won") {
      setFlashWonId(id);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashWonId(null), 650);
    }
    // Persist (RLS allows authenticated members to update lead status).
    // Guard lost-update: only roll back if the UI still shows the optimistic value.
    void createClient()
      .from("leads")
      .update({ status })
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
        }
      });
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
          // Row left this page's filter — refresh so counts/pages stay honest.
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
          requested.current.delete(id); // let a re-expand retry
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

  const order: StatusFilter[] = [
    "all",
    ...STATUS_ORDER,
    "followup",
    "archived",
  ];
  const filterLabel = (f: StatusFilter) =>
    f === "all"
      ? "All"
      : f === "archived"
        ? "Archived"
        : f === "followup"
          ? "Follow-up"
          : statusLabel(f);
  const archiveIcon = (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-label="Archived">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  );
  const filterItems: Filter[] = order.map((f) => ({
    key: f,
    label: filterLabel(f),
    count: counts[f],
    ink: FILTER_COLORS[f].ink,
    solid: FILTER_COLORS[f].solid,
    icon: f === "archived" ? archiveIcon : undefined,
  }));

  return (
    <>
      <QuotesJobsSwitcher />
      <PageHeader title="Quotes" />

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
          onSelect={(k) => setStatusFilter(k as StatusFilter)}
        />

        <label className="search-box field flex items-center gap-2 px-3 py-2 sm:w-64">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-muted" aria-hidden>
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

      <QuotesTable
        key={`${statusFilter}-${safePage}-${pageSize}`}
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
        noLeadsAtAll={totalCount === 0}
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
    </>
  );
}
