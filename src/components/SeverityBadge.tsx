import type { SeverityScore } from "@/lib/types";
import { severityLabel, severityTone } from "@/lib/format";

/**
 * Photo-derived damage severity.
 *
 * Outlined rather than filled — see the note on severityTone. A filled pill
 * here would compete with the status pill it sits beside, and at scores 1 and 5
 * it borrows the won/lost colours closely enough to be misread as one.
 */
export function SeverityBadge({
  score,
  compact = false,
}: {
  score: SeverityScore;
  /** Row variant: just the dot and "N/5", no word. */
  compact?: boolean;
}) {
  const { fg, bg } = severityTone(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ color: fg, background: bg, borderColor: `${fg}33` }}
      title={`Damage severity ${score} of 5 — ${severityLabel(score)}. Graded from the customer's photos.`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: fg }}
      />
      {compact ? `${score}/5` : `Severity ${score}/5`}
      {compact ? null : (
        <span className="font-medium opacity-70">{severityLabel(score)}</span>
      )}
    </span>
  );
}

/**
 * A five-segment meter for the detail panel, where there is room to show the
 * score's position on the scale rather than just its value.
 */
export function SeverityMeter({
  score,
  compact = false,
}: {
  score: SeverityScore;
  /** Drops the caption for use in a labelled icon row, where "Damage severity"
   *  is already implied and cost a whole line of its own. */
  compact?: boolean;
}) {
  const { fg } = severityTone(score);
  return (
    <div>
      {!compact && (
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Damage severity
        </p>
      )}
      <div className={`flex items-center gap-2 ${compact ? "" : "mt-1"}`}>
        <span className="flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className="h-1.5 w-4 rounded-full"
              style={{ backgroundColor: step <= score ? fg : "#e9eaee" }}
            />
          ))}
        </span>
        <span className="text-sm font-semibold" style={{ color: fg }}>
          {score}/5
        </span>
        <span className="text-sm text-muted">{severityLabel(score)}</span>
      </div>
    </div>
  );
}
