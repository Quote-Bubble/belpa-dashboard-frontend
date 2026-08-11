"use client";

import { Check, Undo2, UserRoundPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";

import Toast from "@/components/Toast";
import { EASE_SOFT, POPOVER_TRANSITION, popoverVariants } from "@/lib/motion";
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
 * Signup review, as a trigger in the page header rather than a card in the
 * page body.
 *
 * It started as a full-width panel above the roofer list, which meant the
 * console's most prominent block was permanently occupied by something reading
 * "Nothing waiting" almost every day. Reviewing a signup is rare and takes two
 * seconds; the fleet is what the page is for.
 *
 * The count badge is what stops it being buried — the trigger is quiet when the
 * queue is empty and impossible to miss when it is not, which is behaviour a
 * card cannot have, because a card is always the same size.
 */
export default function Signups({ initial }: { initial: Signup[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [showReviewed, setShowReviewed] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const waiting = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  // Same dismissal contract as RooferMoreMenu: outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const review = (row: Signup, status: Signup["status"]) =>
    start(async () => {
      const previous = rows;
      // Optimistic: the row animating out is the feedback. Reverted below if
      // the call fails, which is the only way this list can lie.
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ghost flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold"
      >
        <UserRoundPlus size={15} strokeWidth={2} aria-hidden />
        Signups
        {waiting.length > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums text-amber-800">
            {waiting.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={popoverVariants}
            initial="hidden"
            animate="shown"
            exit="hidden"
            transition={POPOVER_TRANSITION}
            role="dialog"
            aria-label="Signups"
            // Anchor flips with the header's layout. PageHeader is flex-col
            // below sm, which puts the trigger on the LEFT — a right-anchored
            // 22rem panel would then extend off the left edge of a phone. From
            // sm up the header is a row with the trigger at the right margin,
            // where the opposite is true. max-w keeps it inside the viewport at
            // any width in between.
            // origin follows the anchor so it always scales out of the corner
            // nearest the trigger rather than drifting in from the far side.
            className="surface absolute left-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2.5rem)] origin-top-left overflow-hidden rounded-2xl shadow-lg shadow-black/10 sm:left-auto sm:right-0 sm:origin-top-right"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-semibold text-ink">
                {waiting.length > 0 ? `${waiting.length} waiting` : "Signups"}
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
              <p className="border-t border-line px-4 py-6 text-center text-sm text-muted">
                Nothing waiting.
              </p>
            )}

            {/* Caps at roughly four rows before scrolling, so a burst of
                signups cannot grow the panel past the viewport. */}
            <ul className="max-h-72 divide-y divide-line/70 overflow-y-auto">
              <AnimatePresence initial={false}>
                {waiting.map((r) => (
                  <motion.li
                    key={r.user_id}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: EASE_SOFT }}
                    className="overflow-hidden border-t border-line"
                  >
                    <div className="flex items-center gap-2 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
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

                      <span className="flex shrink-0 gap-1">
                        {/* Cross first, tick last: the consequential action
                            sits furthest from the edge the cursor arrives at. */}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => review(r, "denied")}
                          aria-label={`Deny ${r.email}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <X size={16} strokeWidth={2.2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => review(r, "approved")}
                          aria-label={`Approve ${r.email}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                        >
                          <Check size={16} strokeWidth={2.2} aria-hidden />
                        </button>
                      </span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <AnimatePresence initial={false}>
              {showReviewed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE_SOFT }}
                  className="overflow-hidden border-t border-line bg-black/[0.015]"
                >
                  <ul className="max-h-64 divide-y divide-line/60 overflow-y-auto">
                    {reviewed.map((r) => (
                      <li
                        key={r.user_id}
                        className="flex items-center gap-2 px-4 py-2.5"
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

                        {/* Every decision here is reversible, and the panel
                            should say so — otherwise a mis-click on a real
                            roofer means going to the SQL editor. */}
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
