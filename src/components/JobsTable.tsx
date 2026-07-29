"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type { DashboardLead, LeadPayloadState } from "@/lib/types";
import { EXPAND_TRANSITION, rowExit } from "@/lib/motion";
import { EMPTY, formatRelativeTime, jobTypeLabel } from "@/lib/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { priceVariance, type VarianceResult } from "@/lib/job-stats";
import QuoteDetailPanel from "@/components/QuoteDetailPanel";

export type SortKey =
  | "contactName"
  | "address"
  | "jobType"
  | "actualPrice"
  | "receivedAt";

export type SortDir = "asc" | "desc";

/** Jobs lead with where + who up front; the Quoter estimate moves to the detail
 *  view since the variance chip already carries the accuracy story here. */
const GRID_TEMPLATE =
  "minmax(200px,1.4fr) minmax(200px,1.5fr) 150px 150px 120px 44px 44px";

const gridStyle = { gridTemplateColumns: GRID_TEMPLATE } as const;

const SWIPE_MS = 260;

const HEADER_COLS: { key: SortKey; label: string }[] = [
  { key: "contactName", label: "Contact" },
  { key: "address", label: "Address" },
  { key: "jobType", label: "Job type" },
  { key: "actualPrice", label: "Your price" },
  { key: "receivedAt", label: "Received" },
];

function SortCaret({ dir }: { dir: SortDir }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      className="text-ink-soft"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === "asc" ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8a9 9 0 1 1-1.5 5" />
      <path d="M3 4v4h4" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ transform: expanded ? "rotate(90deg)" : "none" }}
      className="transition-transform duration-150"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function VarianceHint({ result }: { result: VarianceResult }) {
  if (result.kind === "empty") {
    return <span className="text-[11px] text-muted">{EMPTY}</span>;
  }
  if (result.kind === "within") {
    return (
      <span className="text-[11px] font-semibold text-[#0d6b3c]">
        Within range
      </span>
    );
  }
  if (result.kind === "above") {
    return (
      <span className="text-[11px] font-semibold text-[#b45309]">
        +{result.pct}% vs estimate
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold text-[#1546c9]">
      −{result.pct}% vs estimate
    </span>
  );
}

function PriceInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
}) {
  const [draft, setDraft] = useState(
    value != null && Number.isFinite(value) ? String(Math.round(value)) : "",
  );

  useEffect(() => {
    setDraft(
      value != null && Number.isFinite(value) ? String(Math.round(value)) : "",
    );
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const n = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      setDraft(
        value != null && Number.isFinite(value) ? String(Math.round(value)) : "",
      );
      return;
    }
    onCommit(Math.round(n));
  };

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <span className="text-sm text-muted">£</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="—"
        aria-label="Your price ex VAT"
        className="w-full min-w-0 bg-transparent text-sm font-medium tabular-nums text-ink outline-none placeholder:text-muted"
      />
    </div>
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

export default function JobsTable({
  jobs,
  sortKey,
  sortDir,
  onSort,
  onToggle,
  expandedId,
  payloads,
  onArchive,
  onPriceChange,
  archivedView,
  noJobsAtAll,
  page,
  pageSize,
  pageCount,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  jobs: DashboardLead[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onToggle: (id: string) => void;
  expandedId: string | null;
  payloads: Record<string, LeadPayloadState>;
  onArchive: (id: string) => void;
  onPriceChange: (id: string, value: number | null) => void;
  archivedView: boolean;
  noJobsAtAll: boolean;
  page: number;
  pageSize: number;
  pageCount: number;
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
    setSwipingId(id);
    const t1 = window.setTimeout(() => {
      onArchive(id);
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

          <AnimatePresence initial={false}>
            {jobs.map((job) => {
              const expanded = job.id === expandedId;
              const swiping = job.id === swipingId;
              const detailId = `job-detail-${job.id}`;
              const variance = priceVariance(
                job.quoteMinExVat,
                job.quoteMaxExVat,
                job.actualPriceExVat,
              );
              return (
                <motion.div
                  key={job.id}
                  animate={{ opacity: 1 }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    overflow: "hidden",
                    transition: rowExit,
                  }}
                  className="overflow-hidden border-b border-line/60 last:border-0"
                >
                  <div className="relative overflow-hidden">
                    <div
                      className="absolute inset-0 flex items-center justify-end gap-2 px-6 text-sm font-semibold text-amber-900"
                      style={{ backgroundColor: "#f5c542" }}
                      aria-hidden
                    >
                      {archivedView ? <RestoreIcon /> : <ArchiveIcon />}
                      {archivedView ? "Restored" : "Archived"}
                    </div>

                    <div className="row-fg" data-swiping={swiping}>
                      <div
                        className={[
                          "grid items-center gap-x-4 px-6 py-4 text-sm transition-colors duration-150",
                          expanded ? "bg-brand-50" : "hover:bg-black/[0.02]",
                        ].join(" ")}
                        style={gridStyle}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">
                            {job.contactName}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {job.contactPhone}
                          </div>
                        </div>

                        <div className="truncate text-ink-soft">
                          {job.addressFormatted ||
                            job.addressPostcode ||
                            EMPTY}
                        </div>

                        <div className="truncate text-ink-soft">
                          {jobTypeLabel(job.jobType)}
                        </div>

                        <div
                          className="min-w-0"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <PriceInput
                            value={job.actualPriceExVat}
                            onCommit={(v) => onPriceChange(job.id, v)}
                          />
                          <VarianceHint result={variance} />
                        </div>

                        <div className="text-muted" suppressHydrationWarning>
                          {formatRelativeTime(job.receivedAt)}
                        </div>

                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => onToggle(job.id)}
                            aria-expanded={expanded}
                            aria-controls={detailId}
                            aria-label={
                              expanded
                                ? `Collapse job for ${job.contactName}`
                                : `Expand job for ${job.contactName}`
                            }
                            className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
                          >
                            <ExpandChevron expanded={expanded} />
                          </button>
                        </div>

                        <div
                          className="flex justify-center"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleArchive(e, job.id)}
                            aria-label={
                              archivedView
                                ? `Restore job for ${job.contactName}`
                                : `Archive job for ${job.contactName}`
                            }
                            title={archivedView ? "Restore" : "Archive"}
                            className="archive-btn"
                          >
                            {archivedView ? <RestoreIcon /> : <ArchiveIcon />}
                          </button>
                        </div>
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
                              lead={job}
                              payload={payloads[job.id]?.data ?? null}
                              loading={payloads[job.id]?.loading ?? true}
                              error={payloads[job.id]?.error ?? null}
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

      {/* Mobile: each job as a stacked card */}
      <ul className="md:hidden">
        <AnimatePresence initial={false}>
          {jobs.map((job) => {
            const expanded = job.id === expandedId;
            const detailId = `job-detail-m-${job.id}`;
            const variance = priceVariance(
              job.quoteMinExVat,
              job.quoteMaxExVat,
              job.actualPriceExVat,
            );
            return (
              <motion.li
                key={job.id}
                animate={{ opacity: 1 }}
                exit={{ height: 0, opacity: 0, overflow: "hidden", transition: rowExit }}
                className="overflow-hidden border-b border-line/60 last:border-0"
              >
                <div className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onToggle(job.id)}
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    className="block w-full text-left"
                  >
                    <div className="truncate text-[15px] font-semibold text-ink">
                      {job.contactName}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted">
                      {job.contactPhone}
                    </div>
                    <div className="mt-1 truncate text-[13px] text-ink-soft">
                      {job.addressFormatted || job.addressPostcode || EMPTY}
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted">
                      {jobTypeLabel(job.jobType)} · {formatRelativeTime(job.receivedAt)}
                    </div>
                  </button>

                  <div
                    className="mt-3 flex items-end justify-between gap-3"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-ink-soft">
                        Your price
                      </p>
                      <PriceInput
                        value={job.actualPriceExVat}
                        onCommit={(v) => onPriceChange(job.id, v)}
                      />
                      <VarianceHint result={variance} />
                    </div>
                    <button
                      type="button"
                      onClick={() => onArchive(job.id)}
                      className="shrink-0 text-[12px] font-medium text-muted transition-colors hover:text-ink"
                    >
                      {archivedView ? "Restore" : "Archive"}
                    </button>
                  </div>
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
                        lead={job}
                        payload={payloads[job.id]?.data ?? null}
                        loading={payloads[job.id]?.loading ?? true}
                        error={payloads[job.id]?.error ?? null}
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
              : noJobsAtAll
                ? "No completed jobs yet"
                : "No jobs match"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {archivedView
              ? "Jobs you archive will appear here."
              : noJobsAtAll
                ? "When you mark a quote as Completed, it shows up here so you can log the final price."
                : "Try a different filter or clear the search."}
          </p>
        </div>
      )}
    </div>
  );
}
