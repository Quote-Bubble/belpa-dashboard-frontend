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

  return (
    <ul className="grid grid-cols-4 gap-3">
      {visible.map((url, index) => (
        <li key={url} className="min-w-0">
          <Tile
            label={`Customer photo ${index + 1}`}
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
      className="block aspect-square w-full overflow-hidden rounded-xl border border-line bg-black/[0.04] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      {children}
    </button>
  );
}
