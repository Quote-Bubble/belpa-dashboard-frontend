"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import type { DashboardLead } from "@/lib/types";
import MoneyRange from "@/components/MoneyRange";

/**
 * Shown when a roofer marks a quote as Completed, to capture the price they
 * actually quoted (ex VAT) at the moment of winning. Saving records it against
 * the lead so the Jobs tab and estimate-accuracy stats are populated straight
 * away; "Skip for now" just marks it completed and they can log the price later.
 */
export default function CompleteQuoteModal({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: DashboardLead;
  /** null = mark completed with no price yet (skip). */
  onConfirm: (actualPrice: number | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(
    lead.actualPriceExVat != null && Number.isFinite(lead.actualPriceExVat)
      ? String(Math.round(lead.actualPriceExVat))
      : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const firstName = lead.contactName.trim().split(" ")[0] || "them";

  const parsePrice = (): number | null => {
    const t = draft.trim().replace(/,/g, "");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          onClick={onCancel}
          aria-hidden
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Mark quote as completed"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 440, damping: 34 }}
          className="surface relative z-[1] w-full max-w-sm rounded-2xl p-6 shadow-[var(--shadow-float)]"
        >
          <h2 className="font-display text-lg font-semibold text-ink">
            Mark as completed
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            What did you actually quote {firstName}? We&apos;ll compare it to our
            estimate on the Jobs tab.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
            <span className="text-muted">Our estimate</span>
            <span className="font-medium tabular-nums text-ink">
              <MoneyRange
                min={lead.quoteMinExVat}
                max={lead.quoteMaxExVat}
                animate={false}
              />
            </span>
          </div>

          <label
            htmlFor="actual-price"
            className="mt-4 block text-xs font-medium text-ink-soft"
          >
            Your price (ex VAT)
          </label>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-line px-3 py-2 transition-colors focus-within:border-brand-400">
            <span className="text-muted">£</span>
            <input
              id="actual-price"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm(parsePrice());
              }}
              placeholder="e.g. 5,200"
              className="w-full bg-transparent text-sm font-medium tabular-nums text-ink outline-none placeholder:text-muted"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onConfirm(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => onConfirm(parsePrice())}
              className="rounded-full bg-gradient-to-b from-brand-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(31,87,240,0.5)] transition-all hover:-translate-y-px hover:brightness-105 active:translate-y-0"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
