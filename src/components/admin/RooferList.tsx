"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import DeployBadge from "@/components/admin/DeployBadge";
import { listContainer, listItem } from "@/lib/motion";
import type { RooferAdminRow } from "@/lib/types";

/**
 * The fleet list, split out of the page so it can animate — the page itself is
 * a server component and cannot hold motion state.
 *
 * Rows stagger in rather than appearing all at once. On a list this short the
 * effect is almost subliminal, which is the intent: it gives the eye an order
 * to follow down the page instead of presenting a finished block.
 *
 * Uses the shared listContainer/listItem the rest of the dashboard uses, which
 * are opacity-only on purpose — translating on entrance extends scrollable
 * overflow and flashes a scrollbar on load.
 */
export default function RooferList({
  rows,
  counts,
}: {
  rows: RooferAdminRow[];
  counts: Record<string, number>;
}) {
  if (rows.length === 0) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-5 py-14 text-center text-sm text-muted"
      >
        No roofers yet — add your first one above.
      </motion.p>
    );
  }

  return (
    <motion.ul
      className="divide-y divide-line/70"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {rows.map((r) => {
        const leads = counts[r.id] ?? 0;
        return (
          <motion.li key={r.id} variants={listItem}>
            <Link
              href={`/admin/${r.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-black/[0.02] sm:gap-4 sm:px-5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-sm font-semibold text-white transition-transform duration-200 group-hover:scale-[1.06]">
                {r.name.charAt(0).toUpperCase()}
              </span>

              <span className="min-w-0 flex-1 truncate font-semibold text-ink transition-colors duration-150 group-hover:text-brand-700">
                {r.name}
              </span>

              <span className="hidden max-w-[200px] truncate text-sm text-ink-soft lg:block">
                {r.website ? r.website.replace(/^https?:\/\//, "") : null}
              </span>

              <DeployBadge status={r.deploy_status} />

              <span className="hidden w-20 shrink-0 text-right text-sm text-ink-soft sm:block">
                <span className="font-semibold tabular-nums text-ink">
                  {leads}
                </span>{" "}
                <span className="text-xs text-muted">
                  lead{leads === 1 ? "" : "s"}
                </span>
              </span>

              {/* Nudges toward the destination on hover — the only affordance
                  telling you the row is clickable, so it should react. */}
              <ChevronRight
                size={16}
                strokeWidth={2}
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
