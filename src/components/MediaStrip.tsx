"use client";

import RoofMap from "@/components/RoofMap";
import type { MediaItem } from "@/components/MediaViewer";

/**
 * The evidence strip under the street view: roof outline first, then the
 * customer's damage photos, with the overflow collapsed into a "+N" tile.
 *
 * Everything opens the same full-screen viewer. The outline is a live map even
 * at this size — a frozen one, so a stray scroll over the strip does not zoom
 * it — because it is the same component the viewer opens, and rendering it
 * small costs less than the full-size map the panel used to draw anyway.
 */

/** Past this the tiles get too small to tell one slipped tile from another. */
const MAX_VISIBLE = 4;

export default function MediaStrip({
  items,
  onOpen,
}: {
  items: MediaItem[];
  onOpen: (index: number) => void;
}) {
  if (items.length === 0) return null;

  const overflow = Math.max(0, items.length - MAX_VISIBLE);
  const visible = overflow > 0 ? items.slice(0, MAX_VISIBLE - 1) : items;

  return (
    <ul className="mt-2 flex gap-2">
      {visible.map((item, index) => (
        <li key={item.kind === "photo" ? item.url : "map"} className="min-w-0 flex-1">
          <Tile label={item.label} onClick={() => onOpen(index)}>
            {item.kind === "map" ? (
              <div className="pointer-events-none h-full">
                <RoofMap payload={item.payload} variant="thumb" />
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.url}
                alt={item.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </Tile>
        </li>
      ))}

      {overflow > 0 && (
        <li className="min-w-0 flex-1">
          {/* Opens at the first hidden item rather than at the start, so "+3"
              shows you the three you could not see. */}
          <Tile
            label={`Show ${overflow} more`}
            onClick={() => onOpen(MAX_VISIBLE - 1)}
          >
            <span className="flex h-full w-full items-center justify-center bg-black/[0.06] text-sm font-semibold text-ink-soft">
              +{overflow}
            </span>
          </Tile>
        </li>
      )}
    </ul>
  );
}

function Tile({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="block aspect-square w-full overflow-hidden rounded-lg border border-line bg-black/[0.04] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      {children}
    </button>
  );
}
