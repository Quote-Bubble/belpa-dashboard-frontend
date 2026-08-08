import type { Transition, Variants } from "motion/react";

/** Shared with belpa-widget-frontend/lib/motion.ts so the dashboard moves
 *  with the same physics as the quote flow. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export const MOTION_DURATION = {
  fast: 0.16,
  base: 0.24,
  shell: 0.38,
} as const;

/** Row detail expanding out from underneath its row, pushing rows down. */
export const EXPAND_TRANSITION: Transition = {
  duration: MOTION_DURATION.shell,
  ease: EASE_SOFT,
};

export const POPOVER_TRANSITION: Transition = {
  duration: MOTION_DURATION.fast,
  ease: EASE_OUT,
};

/** Status picker option list. */
export const popoverVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  shown: { opacity: 1, y: 0, scale: 1 },
};

/** Staggered list container + item entrance (page load).
 *  Opacity-only — translating on entrance extends scrollable overflow and
 *  flashes a scrollbar on load. */
export const listContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.025, delayChildren: 0.02 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
};

/** Row removal (filter change / status change / archive collapse). */
export const rowExit: Transition = {
  duration: 0.18,
  ease: EASE_SOFT,
};

/**
 * An indicator that slides between targets via a shared layoutId — the tab
 * underline in the admin hub, the filled pill in the install tabs.
 *
 * A spring rather than a duration because the travel distance varies with how
 * far apart the two tabs are. A fixed duration covering 40px and 400px looks
 * sluggish at one end and abrupt at the other; a spring reads the same at both.
 */
export const INDICATOR: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};

/** Section fade-in used for page header + toolbar + table shell. */
export const fadeUp: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: EASE_OUT } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: EASE_OUT } },
};
