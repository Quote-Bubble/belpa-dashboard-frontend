"use client";

import { Archive, ChevronLeft, ChevronRight, ChevronUp, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type {
  DashboardLead,
  LeadPayloadState,
  LeadStatus,
} from "@/lib/types";
import { EXPAND_TRANSITION, rowExit } from "@/lib/motion";
import { formatRelativeTime, jobTypeLabel } from "@/lib/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import StatusPicker from "@/components/StatusPicker";
import QuoteDetailPanel from "@/components/QuoteDetailPanel";
import MoneyRange from "@/components/MoneyRange";

export type SortKey =
  | "contactName"
  | "jobType"
  | "quote"
  | "status"
  | "receivedAt";

export type SortDir = "asc" | "desc";

/** One shared column template keeps header + every row aligned and static.
 *  All columns left-aligned with generous spacing. Chevron + archive trail. */
const GRID_TEMPLATE =
  "minmax(220px,1.6fr) minmax(190px,1.4fr) 170px 140px 130px 44px 44px";

const gridStyle = { gridTemplateColumns: GRID_TEMPLATE } as const;

const SWIPE_MS = 260;

const HEADER_COLS: { key: SortKey; label: string }[] = [
  { key: "contactName", label: "Contact" },
  { key: "jobType", label: "Job type" },
  { key: "quote", label: "Estimate" },
  { key: "status", label: "Status" },
  { key: "receivedAt", label: "Received" },
];

function SortCaret({ dir }: { dir: SortDir }) {
  return (
    <ChevronUp size={13} strokeWidth={2.25} className="text-ink-soft" aria-hidden />
  );
}

function ArchiveIcon() {
  return (
    <Archive size={16} strokeWidth={2} aria-hidden />
  );
}

function RestoreIcon() {
  return (
    <RotateCcw size={16} strokeWidth={2} aria-hidden />
  );
}

function ChevronLeftIcon() {
  return (
    <ChevronLeft size={16} strokeWidth={2} aria-hidden />
  );
}

function ChevronRightIcon() {
  return (
    <ChevronRight size={16} strokeWidth={2} aria-hidden />
  );
}

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <ChevronRight size={16} strokeWidth={2} aria-hidden />
  );
}

function PaginationBar({
  page,
  pageSize,
  pageCount,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const rangeStart = totalCount === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(totalCount, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <label className="flex items-center gap-2 text-sm text-muted">
        Rows per page
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="field rounded-lg px-2 py-1 text-sm font-medium text-ink outline-none"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted">
          {rangeStart}–{rangeEnd} of {totalCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
            aria-label="Previous page"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuotesTable({
  leads,
  sortKey,
  sortDir,
  onSort,
  onToggle,
  expandedId,
  payloads,
  onStatusChange,
  onArchive,
  archivedView,
  noLeadsAtAll,
  rooferSlug,
  flashWonId,
  newId,
  page,
  pageSize,
  pageCount,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  leads: DashboardLead[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onToggle: (id: string) => void;
  expandedId: string | null;
  payloads: Record<string, LeadPayloadState>;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onArchive: (id: string) => void;
  archivedView: boolean;
  /** No leads exist at all, as opposed to none matching the current filter. */
  noLeadsAtAll: boolean;
  rooferSlug: string;
  flashWonId: string | null;
  newId: string | null;
  /** Zero-indexed current page (server-driven). */
  page: number;
  pageSize: number;
  pageCount: number;
  /** Count of leads matching the server query (pre-pagination). */
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  const handleArchive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (swipingId) return;
    setSwipingId(id); // foreground swipes aside, yellow shows behind
    const t1 = window.setTimeout(() => {
      onArchive(id); // row leaves → AnimatePresence collapses the height
      const t2 = window.setTimeout(() => setSwipingId(null), 320);
      timers.current.push(t2);
    }, SWIPE_MS);
    timers.current.push(t1);
  };

  return (
    <div className="surface overflow-hidden rounded-2xl shadow-[0_12px_40px_-24px_rgba(10,11,13,0.35)]">
      {/* Desktop: the full grid table. Hidden on mobile in favour of cards. */}
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[920px]">
          {/* Header */}
          <div
            className="grid items-center gap-x-4 border-b border-line px-6 py-3.5 text-sm"
            style={gridStyle}
          >
            {HEADER_COLS.map((col) => {
              const active = sortKey === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => onSort(col.key)}
                  className={[
                    "inline-flex items-center gap-1.5 text-left font-medium transition-colors hover:text-ink",
                    active ? "text-ink" : "text-muted",
                  ].join(" ")}
                >
                  {col.label}
                  {active && <SortCaret dir={sortDir} />}
                </button>
              );
            })}
            <div aria-hidden />
            <div aria-hidden />
          </div>

          {/* Rows */}
          <AnimatePresence initial={false}>
            {leads.map((lead) => {
              const expanded = lead.id === expandedId;
              const swiping = lead.id === swipingId;
              const flashing = lead.id === flashWonId;
              const isNew = lead.id === newId;
              const detailId = `quote-detail-${lead.id}`;
              return (
                <motion.div
                  key={lead.id}
                  initial={isNew ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={{ height: 0, opacity: 0, overflow: "hidden", transition: rowExit }}
                  className="overflow-hidden border-b border-line/60 last:border-0"
                >
                  {/* clip keeps the swipe in-bounds */}
                  <div className="relative overflow-hidden">
                    {/* Yellow archive backing */}
                    <div
                      className="absolute inset-0 flex items-center justify-end gap-2 px-6 text-sm font-semibold text-amber-900"
                      style={{ backgroundColor: "#f5c542" }}
                      aria-hidden
                    >
                      {archivedView ? <RestoreIcon /> : <ArchiveIcon />}
                      {archivedView ? "Restored" : "Archived"}
                    </div>

                    {/* Foreground tile */}
                    <div className="row-fg" data-swiping={swiping}>
                      {flashing && (
                        <div className="win-flash pointer-events-none absolute inset-0 z-10" />
                      )}
                      {isNew && (
                        <span className="pointer-events-none absolute left-2 top-2 z-10 h-1.5 w-1.5 rounded-full bg-brand-500 pulse-dot" />
                      )}

                      {/* Main row — not a button; expand via dedicated chevron */}
                      <div
                        className={[
                          "grid items-center gap-x-4 px-6 py-4 text-sm transition-colors duration-150",
                          expanded ? "bg-brand-50" : "hover:bg-black/[0.02]",
                        ].join(" ")}
                        style={gridStyle}
                      >
                        {/* Contact */}
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">
                            {lead.contactName}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {lead.contactPhone}
                          </div>
                        </div>

                        {/* Job type */}
                        <div className="min-w-0">
                          <div className="truncate text-ink-soft">
                            {jobTypeLabel(lead.jobType)}
                          </div>
                        </div>

                        {/* Estimate */}
                        <div className="truncate font-medium tabular-nums text-ink">
                          <MoneyRange
                            min={lead.quoteMinExVat}
                            max={lead.quoteMaxExVat}
                            animate={false}
                          />
                        </div>

                        {/* Status */}
                        <div
                          className="min-w-0"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <StatusPicker
                            status={lead.status}
                            onChange={(s) => onStatusChange(lead.id, s)}
                          />
                        </div>

                        {/* Received */}
                        <div className="text-muted" suppressHydrationWarning>
                          {formatRelativeTime(lead.receivedAt)}
                        </div>

                        {/* Expand chevron */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => onToggle(lead.id)}
                            aria-expanded={expanded}
                            aria-controls={detailId}
                            aria-label={
                              expanded
                                ? `Collapse quote for ${lead.contactName}`
                                : `Expand quote for ${lead.contactName}`
                            }
                            className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
                          >
                            <ExpandChevron expanded={expanded} />
                          </button>
                        </div>

                        {/* Archive / restore */}
                        <div
                          className="flex justify-center"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleArchive(e, lead.id)}
                            aria-label={
                              archivedView
                                ? `Restore quote for ${lead.contactName}`
                                : `Archive quote for ${lead.contactName}`
                            }
                            title={archivedView ? "Restore" : "Archive"}
                            className="archive-btn"
                          >
                            {archivedView ? <RestoreIcon /> : <ArchiveIcon />}
                          </button>
                        </div>
                      </div>

                      {/* Inline expanding detail */}
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            key="detail"
                            id={detailId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={EXPAND_TRANSITION}
                            style={{ overflow: "hidden" }}
                            className="bg-black/[0.015]"
                          >
                            <QuoteDetailPanel
                              lead={lead}
                              payload={payloads[lead.id]?.data ?? null}
                              loading={payloads[lead.id]?.loading ?? true}
                              error={payloads[lead.id]?.error ?? null}
                              onStatusChange={onStatusChange}
                              onArchive={onArchive}
                              archivedView={archivedView}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile: each lead as a stacked card */}
      <ul className="md:hidden">
        <AnimatePresence initial={false}>
          {leads.map((lead) => {
            const expanded = lead.id === expandedId;
            const detailId = `quote-detail-m-${lead.id}`;
            return (
              <motion.li
                key={lead.id}
                animate={{ opacity: 1 }}
                exit={{ height: 0, opacity: 0, overflow: "hidden", transition: rowExit }}
                className="overflow-hidden border-b border-line/60 last:border-0"
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onToggle(lead.id)}
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-[15px] font-semibold text-ink">
                      {lead.contactName}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted">
                      {lead.contactPhone}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      <span className="text-ink-soft">
                        {jobTypeLabel(lead.jobType)}
                      </span>
                      <span className="font-medium tabular-nums text-ink">
                        <MoneyRange
                          min={lead.quoteMinExVat}
                          max={lead.quoteMaxExVat}
                          animate={false}
                        />
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <StatusPicker
                        status={lead.status}
                        onChange={(s) => onStatusChange(lead.id, s)}
                      />
                    </div>
                    <span
                      className="text-[12px] text-muted"
                      suppressHydrationWarning
                    >
                      {formatRelativeTime(lead.receivedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end px-4 pb-2.5">
                  <button
                    type="button"
                    onClick={() => onArchive(lead.id)}
                    className="text-[12px] font-medium text-muted transition-colors hover:text-ink"
                  >
                    {archivedView ? "Restore" : "Archive"}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="detail"
                      id={detailId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={EXPAND_TRANSITION}
                      style={{ overflow: "hidden" }}
                      className="bg-black/[0.015]"
                    >
                      <QuoteDetailPanel
                        lead={lead}
                        payload={payloads[lead.id]?.data ?? null}
                        loading={payloads[lead.id]?.loading ?? true}
                        error={payloads[lead.id]?.error ?? null}
                        onStatusChange={onStatusChange}
                        onArchive={onArchive}
                        archivedView={archivedView}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {totalCount > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          pageCount={pageCount}
          totalCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      {totalCount === 0 && (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl">
            🏠
          </div>
          <p className="text-sm font-semibold text-ink">
            {archivedView
              ? "Nothing archived"
              : noLeadsAtAll
                ? "No leads yet"
                : "No quotes match"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {archivedView ? (
              "Quotes you archive will appear here."
            ) : noLeadsAtAll ? (
              <>
                Nobody has submitted a quote through your widget yet. It posts to{" "}
                <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-xs">
                  {rooferSlug}
                </code>
                .
              </>
            ) : (
              "Try a different status or clear the search."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
