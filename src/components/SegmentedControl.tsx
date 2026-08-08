"use client";

import { motion } from "motion/react";

import { INDICATOR } from "@/lib/motion";

/**
 * A pill-style segmented control with a filled indicator that slides between
 * options rather than blinking from one to the next.
 *
 * This exists as one component because the hand-rolled version broke twice in
 * the same way. The trap: the obvious way to put the pill behind the label is
 * `absolute inset-0 -z-10`, and it looks right until you notice the button is
 * `position: relative` with `z-index: auto` — which does NOT open a stacking
 * context. The negative-z child then escapes the button and paints behind the
 * nearest ancestor background. These controls sit inside a white capsule, so
 * the pill vanished behind it, and since the active label is white it vanished
 * too: an empty white pill with the selected option missing entirely.
 *
 * The fix is to not use z-index at all. Positioned elements paint above
 * non-positioned ones, and among positioned siblings with `z-index: auto` the
 * later one in the DOM wins — so an absolute pill followed by a relative label
 * layers correctly with no stacking involved. That ordering is load-bearing:
 * the label must come after the pill in the JSX below.
 *
 * layoutId must be unique per control on the page. Two controls sharing one id
 * makes the pill fly between them when either changes.
 */
export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Disables this option only — the control stays usable. */
  disabled?: boolean;
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  disabled = false,
  fullWidth = false,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Unique per control instance on the page. */
  layoutId: string;
  /** Disables the whole control (e.g. while a request is in flight). */
  disabled?: boolean;
  /** Stretch to fill on small screens — used where it sits above a full-width block. */
  fullWidth?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        "flex rounded-full border border-line bg-white p-0.5",
        fullWidth ? "w-full sm:inline-flex sm:w-auto" : "inline-flex",
      ].join(" ")}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled || o.disabled || active}
            onClick={() => onChange(o.value)}
            className={[
              "relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 disabled:cursor-default",
              fullWidth ? "flex-1 sm:flex-none" : "",
              active
                ? "text-white"
                : "text-ink-soft hover:text-ink disabled:opacity-60",
            ].join(" ")}
          >
            {/* Order matters — see the note above. Pill first, label second. */}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-brand-600"
                transition={INDICATOR}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
