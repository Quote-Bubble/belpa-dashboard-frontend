"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen viewer for the customer's damage photos, paged with arrows.
 *
 * Photos only. The aerial used to open in here too, but it is a live map: it
 * pans and zooms perfectly well in the panel, and a map inside a lightbox is a
 * worse version of the same thing. A photograph is the only item here that
 * genuinely benefits from filling the screen.
 *
 * Rendered through a portal onto document.body rather than in place. The detail
 * panel lives inside a row that animates its height with `overflow: hidden`,
 * and while a `position: fixed` child usually escapes that, it stops escaping
 * the moment any ancestor gains a transform, filter or will-change — which an
 * animation library may add at any point. A portal does not depend on that
 * staying true.
 */

export type MediaItem = { label: string; url: string };

/** Below this, a horizontal drag is a scroll or a wobble, not a swipe. */
const SWIPE_THRESHOLD_PX = 48;

export default function MediaViewer({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: MediaItem[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const count = items.length;
  const go = useCallback(
    (delta: number) => {
      if (count === 0) return;
      // Wrap, so paging never dead-ends on the last photo.
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Hold the page still underneath. Without this the list behind scrolls away
  // under a phone's momentum and the panel is somewhere else on close.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Move focus in, so Escape and the arrow keys work without a click first.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // No mounted-flag dance: the parent only renders this once the roofer has
  // clicked a thumbnail, so it cannot exist during server rendering.
  if (count === 0) return null;
  const item = items[Math.min(Math.max(index, 0), count - 1)];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.label}
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
        go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.label}</p>
          {count > 1 && (
            <p className="text-xs text-white/60">
              {index + 1} of {count}
            </p>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="shrink-0 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Stop propagation so interacting with the content — panning the map,
          pinching a photo — does not count as a click on the backdrop. */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {count > 1 && (
          <NavButton side="left" onClick={() => go(-1)} />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.label}
          className="max-h-full max-w-full rounded-lg object-contain"
        />

        {count > 1 && <NavButton side="right" onClick={() => go(1)} />}
      </div>
    </div>,
    document.body,
  );
}

/** Big enough to hit with a thumb; inset on phones where there is no gutter. */
function NavButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={[
        "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white",
        "transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        side === "left" ? "left-1 sm:left-3" : "right-1 sm:right-3",
      ].join(" ")}
    >
      {side === "left" ? (
        <ChevronLeft size={22} strokeWidth={2.25} />
      ) : (
        <ChevronRight size={22} strokeWidth={2.25} />
      )}
    </button>
  );
}
