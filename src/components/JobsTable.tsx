"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type { DashboardLead } from "@/lib/types";
import { rowExit } from "@/lib/motion";
import {
  EMPTY,
  formatQuoteRange,
  formatRelativeTime,
  jobTypeLabel,
} from "@/lib/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { priceVariance, type VarianceResult } from "@/lib/job-stats";

const GRID_TEMPLATE =
  "minmax(200px,1.5fr) minmax(160px,1.2fr) 150px 140px 130px 120px 44px";

const gridStyle = { gridTemplateColumns: GRID_TEMPLATE } as const;

const SWIPE_MS = 260;

type SortKey =
  | "contactName"
  | "jobType"
  | "quote"
  | "actualPrice"
  | "receivedAt";
type SortDir = "asc" | "desc";

const HEADER_COLS: { key: SortKey | "variance"; label: string; sortable: boolean }[] = [
  { key: "contactName", label: "Contact", sortable: true },
  { key: "jobType", label: "Job type", sortable: true },
  { key: "quote", label: "Our estimate", sortable: true },
  { key: "actualPrice", label: "Your price", sortable: true },
  { key: "variance", label: "Variance", sortable: false },
  { key: "receivedAt", label: "Received", sortable: true },
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

function VarianceChip({ result }: { result: VarianceResult }) {
  if (result.kind === "empty") {
    return <span className="text-sm text-muted">{EMPTY}</span>;
  }
  if (result.kind === "within") {
    return (
      <span className="inline-flex rounded-full bg-[#e6f6ee] px-2.5 py-0.5 text-xs font-semibold text-[#0d6b3c]">
        Within range
      </span>
    );
  }
  if (result.kind === "above") {
    return (
      <span className="inline-flex rounded-full bg-[#fff7e8] px-2.5 py-0.5 text-xs font-semibold text-[#b45309]">
        +{result.pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-xs font-semibold text-[#1546c9]">
      −{result.pct}%
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
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted">£</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="—"
        aria-label="Your price ex VAT"
        className="field w-[5.5rem] rounded-lg px-2 py-1.5 text-sm font-medium text-ink outline-none"
      />
    </div>
  );
}

export default function JobsTable({
  jobs,
  sortKey,
  sortDir,
  onSort,
  onArchive,
  onPriceChange,
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
  onArchive: (id: string) => void;
  onPriceChange: (id: string, value: number | null) => void;
  noJobsAtAll: boolean;
  page: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const [exitingId, setExitingId] = useState<string | null>(null);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, []);

  const requestArchive = (id: string) => {
    if (exitingId) return;
    setExitingId(id);
    exitTimer.current = window.setTimeout(() => {
      onArchive(id);
      setExitingId(null);
    }, SWIPE_MS);
  };

  if (noJobsAtAll) {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-ink">
          No won jobs yet
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          When you mark a quote as Won, it shows up here so you can log the
          final price.
        </p>
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div
        className="hidden items-center gap-3 border-b border-[color-mix(in_srgb,var(--line)_80%,transparent)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted md:grid"
        style={gridStyle}
      >
        {HEADER_COLS.map((col) => {
          if (!col.sortable) {
            return <span key={col.key}>{col.label}</span>;
          }
          const key = col.key as SortKey;
          const active = sortKey === key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => onSort(key)}
              className="flex items-center gap-1 text-left hover:text-ink"
            >
              {col.label}
              {active ? <SortCaret dir={sortDir} /> : null}
            </button>
          );
        })}
        <span className="sr-only">Archive</span>
      </div>

      <ul className="divide-y divide-[color-mix(in_srgb,var(--line)_70%,transparent)]">
        <AnimatePresence initial={false}>
          {jobs.map((job) => {
            const variance = priceVariance(
              job.quoteMinExVat,
              job.quoteMaxExVat,
              job.actualPriceExVat,
            );
            const exiting = exitingId === job.id;
            return (
              <motion.li
                key={job.id}
                layout="position"
                initial={false}
                animate={
                  exiting
                    ? { opacity: 0, x: 48, transition: rowExit }
                    : { opacity: 1, x: 0 }
                }
                className="relative"
              >
                <div
                  className="grid items-center gap-3 px-4 py-3.5"
                  style={gridStyle}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {job.contactName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {job.addressPostcode || job.addressFormatted}
                    </p>
                  </div>
                  <p className="text-sm text-ink">{jobTypeLabel(job.jobType)}</p>
                  <p className="text-sm font-medium text-ink">
                    {formatQuoteRange(job.quoteMinExVat, job.quoteMaxExVat)}
                  </p>
                  <PriceInput
                    value={job.actualPriceExVat}
                    onCommit={(v) => onPriceChange(job.id, v)}
                  />
                  <VarianceChip result={variance} />
                  <p className="text-sm text-muted">
                    {formatRelativeTime(job.receivedAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => requestArchive(job.id)}
                    className="justify-self-end rounded-lg p-2 text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--surface)_70%,#0a0b0d_8%)] hover:text-ink"
                    aria-label={`Archive ${job.contactName}`}
                    title="Archive"
                  >
                    <ArchiveIcon />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {totalCount > 0 ? (
        <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--line)_80%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {totalCount} job{totalCount === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              Rows
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="field rounded-lg px-2 py-1 text-xs font-medium text-ink outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => onPageChange(page - 1)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-ink disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-muted">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => onPageChange(page + 1)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type { SortKey, SortDir };
