import type { LeadIntent } from "@/lib/types";

/**
 * Tiers a lead by how much intent it showed, so a roofer can tell a genuine
 * quote request from someone who just peeked at a price. Hot tiers (an explicit
 * ask) read green; a "priced only" lead is deliberately muted so it doesn't
 * compete for attention with the leads worth chasing.
 */
const INTENT_META: Record<
  LeadIntent,
  { label: string; className: string; dot: string }
> = {
  quote_requested: {
    label: "Quote requested",
    className: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  callback_requested: {
    label: "Callback",
    className: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  estimate_viewed: {
    label: "Priced only",
    className: "bg-black/[0.04] text-muted",
    dot: "bg-ink-soft/40",
  },
};

export default function IntentBadge({ intent }: { intent: LeadIntent }) {
  const meta = INTENT_META[intent] ?? INTENT_META.estimate_viewed;
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
