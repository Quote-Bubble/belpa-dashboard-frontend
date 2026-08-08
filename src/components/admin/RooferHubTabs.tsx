"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { INDICATOR } from "@/lib/motion";

export type RooferHubTab = "quotes" | "jobs" | "pricing" | "setup";

const TABS: { id: RooferHubTab; label: string }[] = [
  { id: "quotes", label: "Quotes" },
  { id: "jobs", label: "Jobs" },
  { id: "pricing", label: "Pricing" },
  { id: "setup", label: "Setup" },
];

export default function RooferHubTabs({
  rooferId,
  active,
  quoteCount,
  jobCount,
}: {
  rooferId: string;
  active: RooferHubTab;
  quoteCount: number;
  jobCount: number;
}) {
  const countFor = (id: RooferHubTab) => {
    if (id === "quotes") return quoteCount;
    if (id === "jobs") return jobCount;
    return null;
  };

  return (
    <div className="mb-5 flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const selected = t.id === active;
        const count = countFor(t.id);
        return (
          <Link
            key={t.id}
            href={
              t.id === "quotes"
                ? `/admin/${rooferId}`
                : `/admin/${rooferId}?tab=${t.id}`
            }
            aria-current={selected ? "page" : undefined}
            className={[
              "relative px-3.5 py-3 text-sm font-semibold transition-colors",
              selected ? "text-ink" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2">
              {t.label}
              {count != null ? (
                <span
                  className={[
                    "min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums leading-none transition-colors duration-200",
                    selected
                      ? "bg-brand-600 text-white"
                      : "bg-black/[0.06] text-ink-soft",
                  ].join(" ")}
                >
                  {count}
                </span>
              ) : null}
            </span>
            {selected && (
              // Shared layoutId means the SAME element travels between tabs
              // instead of one unmounting and another appearing. That travel is
              // the whole point: it shows where the selection went, so a tab
              // change reads as a move rather than a page swap.
              //
              // These are Links, so the underline also has to survive a route
              // change. It does, because every tab renders from this one array
              // in one component — the tree is stable across navigations and
              // Motion can match the ids.
              <motion.span
                layoutId="roofer-hub-tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600"
                transition={INDICATOR}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
