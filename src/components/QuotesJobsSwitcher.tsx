"use client";

import { motion } from "motion/react";

import { useDashboardMode } from "@/components/DashboardModeProvider";
import type { DashboardMode } from "@/lib/dashboard-mode";

const TABS: { mode: DashboardMode; label: string }[] = [
  { mode: "quotes", label: "Quotes" },
  { mode: "jobs", label: "Jobs" },
];

/**
 * Shell-level Quotes | Jobs mode switcher. Sits above sidebar nav and scopes
 * the inbox + analytics lens; Account/Support stay global.
 */
export default function QuotesJobsSwitcher({
  className = "",
  onSelect,
}: {
  className?: string;
  onSelect?: () => void;
}) {
  const { mode, setMode } = useDashboardMode();

  return (
    <div
      role="tablist"
      aria-label="Dashboard mode"
      className={`relative inline-flex w-full rounded-full bg-[color-mix(in_srgb,var(--surface)_88%,#0a0b0d_6%)] p-1 shadow-[inset_0_0_0_1px_rgba(10,11,13,0.06)] ${className}`}
    >
      {TABS.map((tab) => {
        const isActive = tab.mode === mode;
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setMode(tab.mode);
              onSelect?.();
            }}
            className={`relative z-[1] flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              isActive ? "text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {isActive ? (
              <motion.span
                layoutId="quotes-jobs-pill"
                className="absolute inset-0 -z-[1] rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
