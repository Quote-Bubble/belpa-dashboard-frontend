"use client";

/**
 * The customer's damage photos, as a row of thumbnails with the overflow
 * collapsed into a "+N" tile.
 *
 * Photos only. The property views — frontage and aerial — used to share this
 * strip, which put a picture of a broken tile beside a map at the same size as
 * though they answered the same question. They now sit in their own labelled
 * row above, and this one is just "what the customer sent".
 */

/** Past this the tiles get too small to tell one slipped tile from another. */
const MAX_VISIBLE = 4;

/**
 * Grid shape for the number of tiles actually being drawn.
 *
 * Both the columns AND the tile proportion have to follow the count. Four
 * fixed columns left one photo as a small square with three empty slots.
 * Flooring it at two columns fixed the size but not the shape: a half-width
 * SQUARE is nearly as tall as the whole property row above it, with the other
 * half of the row still empty.
 *
 * So a lone photo takes the full width in landscape, which fills the row and
 * matches how the property tiles stack when there are none. Two or three sit
 * in 4:3, the same proportion as the tiles above them. Only at four does a
 * square make sense, because by then they are thumbnails.
 *
 * Written out rather than interpolated: Tailwind scans source text for class
 * names, so `grid-cols-${n}` would never be generated.
 */
const SHAPE: Record<number, { cols: string; aspect: string }> = {
  1: { cols: "grid-cols-1", aspect: "aspect-[16/10]" },
  2: { cols: "grid-cols-2", aspect: "aspect-[4/3]" },
  3: { cols: "grid-cols-3", aspect: "aspect-[4/3]" },
  4: { cols: "grid-cols-4", aspect: "aspect-square" },
};

export default function MediaStrip({
  urls,
  onOpen,
}: {
  urls: string[];
  onOpen: (index: number) => void;
}) {
  if (urls.length === 0) return null;

  const overflow = Math.max(0, urls.length - MAX_VISIBLE);
  const visible = overflow > 0 ? urls.slice(0, MAX_VISIBLE - 1) : urls;
  // The "+N" tile is one of the tiles, so it counts toward the column split.
  const tiles = visible.length + (overflow > 0 ? 1 : 0);
  const shape = SHAPE[tiles] ?? SHAPE[4];

  return (
    <ul className={`grid gap-3 ${shape.cols}`}>
      {visible.map((url, index) => (
        <li key={url} className="min-w-0">
          <Tile
            label={`Customer photo ${index + 1}`}
            aspect={shape.aspect}
            onClick={() => onOpen(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Customer photo ${index + 1}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </Tile>
        </li>
      ))}

      {overflow > 0 && (
        <li className="min-w-0">
          {/* Opens at the first hidden photo rather than at the start, so "+3"
              shows you the three you could not see. */}
          <Tile
            label={`Show ${overflow} more`}
            aspect={shape.aspect}
            onClick={() => onOpen(MAX_VISIBLE - 1)}
          >
            <span className="flex h-full w-full items-center justify-center bg-black/[0.06] text-base font-semibold text-ink-soft">
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
  aspect,
  onClick,
  children,
}: {
  label: string;
  aspect: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`block w-full overflow-hidden rounded-xl border border-line bg-black/[0.04] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${aspect}`}
    >
      {children}
    </button>
  );
}
