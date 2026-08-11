"use client";

import { Check, X, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";

import Toast from "@/components/Toast";
import { EASE_SOFT, listContainer, listItem } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";

export type Signup = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
  status: "pending" | "approved" | "denied";
  roofers: string | null;
};

/**
 * Signup review queue.
 *
 * Signup is open, but onboarding is manual — so an account nobody asked for
 * should not reach the dashboard. This is where that call gets made.
 *
 * Pending sits at the top and is the only part that demands attention; once
 * reviewed, an entry drops into a quieter list below that stays collapsed. The
 * queue should read as empty when there is nothing to do, because a panel that
 * always looks busy is one you stop looking at.
 */
export default function Signups({ initial }: { initial: Signup[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const [showReviewed, setShowReviewed] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);

  const waiting = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  const review = (row: Signup, status: Signup["status"]) =>
    start(async () => {
      const previous = rows;
      // Optimistic: the row animating out is the feedback. Reverted below if
      // the call fails, which is the only way the list can lie.
      setRows((rs) =>
        rs.map((r) => (r.user_id === row.user_id ? { ...r, status } : r)),
      );

      const { error } = await supabase.rpc("admin_set_signup_status", {
        p_user_id: row.user_id,
        p_status: status,
      });

      if (error) {
        setRows(previous);
        setToast({ message: error.message, tone: "error" });
        return;
      }
      setToast({
        message:
          status === "approved"
            ? `${row.email} can now use the dashboard.`
            : status === "denied"
              ? `${row.email} is blocked.`
              : `${row.email} moved back to pending.`,
        tone: "ok",
      });
    });

  return (
    <div className="surface mb-6 overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-ink">Signups</span>
          {waiting.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
              {waiting.length} waiting
            </span>
          )}
        </span>
        {reviewed.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReviewed((v) => !v)}
            className="text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            {showReviewed ? "Hide" : `Reviewed · ${reviewed.length}`}
          </button>
        )}
      </div>

      {waiting.length === 0 && (
        <p className="border-t border-line px-5 py-6 text-center text-sm text-muted">
          Nothing waiting.
        </p>
      )}

      <motion.ul
        className="divide-y divide-line/70"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence initial={false}>
          {waiting.map((r) => (
            <motion.li
              key={r.user_id}
              variants={listItem}
              layout
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: EASE_SOFT }}
              className="overflow-hidden border-t border-line"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {r.email}
                  </span>
                  <span className="block text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>

                <span className="flex shrink-0 gap-1.5">
                  {/* Cross first, tick last. The tick is the consequential one
                      and sits furthest from the row's edge, so a mis-aimed tap
                      while scrolling lands on the reversible action. */}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => review(r, "denied")}
                    aria-label={`Deny ${r.email}`}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={17} strokeWidth={2.2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => review(r, "approved")}
                    aria-label={`Approve ${r.email}`}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                  >
                    <Check size={17} strokeWidth={2.2} aria-hidden />
                  </button>
                </span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence initial={false}>
        {showReviewed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_SOFT }}
            className="overflow-hidden border-t border-line bg-black/[0.015]"
          >
            <ul className="divide-y divide-line/60">
              {reviewed.map((r) => (
                <li
                  key={r.user_id}
                  className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink-soft">
                      {r.email}
                    </span>
                    {r.roofers && (
                      <span className="block truncate text-[11px] text-muted">
                        {r.roofers}
                      </span>
                    )}
                  </span>

                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      r.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700",
                    ].join(" ")}
                  >
                    {r.status === "approved" ? "Approved" : "Denied"}
                  </span>

                  {/* Every decision here is reversible, and the panel should
                      say so — otherwise a mis-click on a real roofer means
                      going to the SQL editor. */}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => review(r, "pending")}
                    aria-label={`Undo review for ${r.email}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink disabled:opacity-50"
                  >
                    <Undo2 size={13} strokeWidth={2} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
