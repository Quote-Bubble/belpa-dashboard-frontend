import type { LeadPayload } from "@/lib/types";
import { project, sanitizePolygonCoords } from "@/lib/roof-plan";

// Re-export for fuzz tests and any callers that imported from the component.
export { project, sanitizePolygonCoords } from "@/lib/roof-plan";

/**
 * Plan view of the roof face the customer drew in the widget.
 *
 * Only ONE face survives to the database (the widget keeps the largest and
 * discards the others), and gutter/obstruction positions are never stored —
 * so this draws the outline and nothing else. Gutter length and obstruction
 * counts are shown as figures by the caller, not as markers on the shape.
 */

const VIEW = 100;

function Empty({ note }: { note: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-black/[0.015] px-4 text-center">
      <svg
        width={26}
        height={26}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted"
        aria-hidden
      >
        <path d="M3 11l9-7 9 7M5 10v10h14V10" />
      </svg>
      <p className="mt-2 text-sm font-medium text-ink-soft">
        No roof outline captured
      </p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </div>
  );
}

export default function RoofPlan({ payload }: { payload: LeadPayload | null }) {
  if (!payload) {
    return <Empty note="Lead detail hasn't loaded." />;
  }

  const coords = sanitizePolygonCoords(payload.polygonCoords);
  if (coords.length < 3) {
    return <Empty note="This lead was submitted without a drawn roof." />;
  }

  const projected = project(coords);
  if (!projected) {
    return <Empty note="The stored outline could not be read." />;
  }

  const area = payload.solar?.areaM2;
  const pitch = payload.solar?.pitchDegrees;
  const roofType = payload.solar?.roofType;

  /* Sighted users read these three off the Roof cluster sitting directly
     beneath the plan, so they are no longer drawn as chips on the image —
     that printed every figure twice. They stay here purely to describe the
     shape to screen readers, which have no such adjacent context. */
  const facts = [
    area != null ? `${Math.round(area)} m²` : null,
    pitch != null ? `${Math.round(pitch)}°` : null,
    roofType ?? null,
  ].filter(Boolean) as string[];

  return (
    <figure className="relative h-full min-h-[220px] overflow-hidden rounded-xl border border-line bg-[#0f1520]">
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Plan view of the drawn roof outline${
          facts.length ? `, ${facts.join(", ")}` : ""
        }`}
      >
        <defs>
          <pattern
            id="roofplan-grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M10 0H0V10"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width={VIEW} height={VIEW} fill="url(#roofplan-grid)" />
        <polygon
          points={projected.points}
          fill="rgba(94,160,255,0.22)"
          stroke="#7cb0ff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {projected.widthM != null && projected.widthM > 0 && (
        <span className="absolute bottom-3 right-3 text-[11px] font-medium text-white/60">
          ≈ {projected.widthM.toFixed(1)} m across
        </span>
      )}
    </figure>
  );
}
