"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const TABS = [
  { href: "/quotes", label: "Quotes" },
  { href: "/jobs", label: "Jobs" },
] as const;

/**
 * Top-left Quotes | Jobs switcher with a sliding active pill.
 * Lives on both routes; sidebar nav stays Quotes-only.
 */
export default function QuotesJobsSwitcher() {
  const pathname = usePathname();
  const active =
    TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
      ?.href ?? "/quotes";

  return (
    <div
      role="tablist"
      aria-label="Quotes and jobs"
      className="relative mb-5 inline-flex rounded-full bg-[color-mix(in_srgb,var(--surface)_88%,#0a0b0d_6%)] p-1 shadow-[inset_0_0_0_1px_rgba(10,11,13,0.06)]"
    >
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={`relative z-[1] rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
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
          </Link>
        );
      })}
    </div>
  );
}
