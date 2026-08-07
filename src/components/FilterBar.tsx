"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

export type Filter = {
  key: string;
  label: string;
  count: number;
  ink: string; // idle text colour
  solid: string; // bubble colour when it's over this filter
  icon?: React.ReactNode; // shown instead of the label
};

type Rect = { left: number; width: number };

export default function FilterBar({
  filters,
  activeKey,
  onSelect,
}: {
  filters: Filter[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rects, setRects] = useState<Rect[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  const activeIndex = Math.max(
    0,
    filters.findIndex((f) => f.key === activeKey),
  );
  const targetIndex = hoverIndex ?? activeIndex;

  // Springs drive the bubble's position + width; velocity drives the squish.
  const x = useSpring(0, { stiffness: 620, damping: 34, mass: 1 });
  const w = useSpring(0, { stiffness: 620, damping: 34, mass: 1 });
  // `reachX/Y` (-1..1) = where the cursor sits relative to the bubble centre.
  // The bubble body stays put and physically STRETCHES toward the cursor (a
  // jelly-like 2D deformation), rather than translating to follow it. Springs
  // give it weight so it eases and wobbles rather than tracking 1:1.
  const reachXTarget = useMotionValue(0);
  const reachYTarget = useMotionValue(0);
  const reachX = useSpring(reachXTarget, { stiffness: 260, damping: 18, mass: 0.7 });
  const reachY = useSpring(reachYTarget, { stiffness: 260, damping: 18, mass: 0.7 });
  const vx = useVelocity(x);
  const energy = useTransform(vx, (v) => Math.min(1, Math.abs(v) / 1700));
  // Velocity squish (travel) × directional stretch toward the cursor.
  const scaleX = useTransform(
    [energy, reachX] as const,
    ([e, r]: number[]) => (1 + e * 0.22) * (1 + Math.abs(r) * 0.14),
  );
  const scaleY = useTransform(
    [energy, reachY] as const,
    ([e, r]: number[]) => (1 - e * 0.16) * (1 + Math.abs(r) * 0.18),
  );
  // Anchor the corner opposite the cursor so the bubble bulges toward it.
  const originXpc = useTransform(reachX, (r) => (1 - r) * 50);
  const originYpc = useTransform(reachY, (r) => (1 - r) * 50);
  const morphOrigin = useTransform(
    [originXpc, originYpc] as const,
    ([ox, oy]: number[]) => `${ox}% ${oy}%`,
  );

  const measure = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cRect = c.getBoundingClientRect();
    const next = btnRefs.current.map((b) => {
      const r = b?.getBoundingClientRect();
      return r
        ? { left: r.left - cRect.left, width: r.width }
        : { left: 0, width: 0 };
    });
    setRects(next);
  }, []);

  const sig = filters.map((f) => f.key + f.count).join("|");
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // Re-measure when the label/count widths change.
  }, [measure, sig]);

  // Rest the bubble on its target (jump into place on first paint). While the
  // pointer is over the bar, onPointerMove owns x/y — this only handles resting.
  useEffect(() => {
    const r = rects[targetIndex];
    if (!r || r.width === 0) return;
    if (!readyRef.current) {
      x.jump(r.left);
      w.jump(r.width);
      readyRef.current = true;
      setReady(true);
      return;
    }
    // The bubble body always snaps to the cell; the morph handles the cursor.
    x.set(r.left);
    w.set(r.width);
    if (hoverIndex === null) {
      reachXTarget.set(0);
      reachYTarget.set(0);
    }
  }, [rects, targetIndex, hoverIndex, x, w, reachXTarget, reachYTarget]);

  const onPointerMove = (e: React.PointerEvent) => {
    const c = containerRef.current;
    if (!c || rects.length === 0) return;
    const cRect = c.getBoundingClientRect();
    const px = e.clientX - cRect.left;
    const py = e.clientY - cRect.top;

    // Nearest filter under the cursor.
    let idx = 0;
    let best = Infinity;
    rects.forEach((r, i) => {
      const center = r.left + r.width / 2;
      const d = Math.abs(px - center);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    setHoverIndex(idx);

    // Stretch toward the cursor. X uses a 2x-wider boundary (reacts earlier).
    const r = rects[idx];
    const centerX = r.left + r.width / 2;
    const reachHalfX = Math.max(1, r.width); // 2x the cell half-width
    const halfY = Math.max(1, cRect.height / 2);
    reachXTarget.set(Math.max(-1, Math.min(1, (px - centerX) / reachHalfX)));
    reachYTarget.set(Math.max(-1, Math.min(1, (py - cRect.height / 2) / halfY)));
  };

  // Hovering a filter you haven't selected = a muted preview; selecting = full colour.
  const previewing = hoverIndex !== null && hoverIndex !== activeIndex;
  const targetColor = filters[targetIndex]?.solid ?? "#0a0b0d";

  return (
    <>
      {/* Mobile: one compact dropdown so filters live behind a single tap and
          don't eat vertical space. Counts ride along in each option. */}
      <div className="relative md:hidden">
        <select
          value={activeKey}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Filter"
          className="field w-full appearance-none rounded-full py-2.5 pl-4 pr-10 text-sm font-semibold text-ink outline-none"
        >
          {filters.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label} ({f.count})
            </option>
          ))}
        </select>
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </div>

      {/* Desktop: the chip bar with the jelly bubble. */}
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        className="relative hidden gap-1 md:flex md:flex-nowrap md:overflow-x-auto md:[-ms-overflow-style:none] md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
      >
        {/* The squishy bubble */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-0 hidden rounded-full transition-opacity duration-500 md:block"
        style={{
          x,
          width: w,
          scaleX,
          scaleY,
          transformOrigin: morphOrigin,
          backgroundColor: targetColor,
          opacity: ready ? (previewing ? 0.5 : 1) : 0,
        }}
        animate={{ backgroundColor: targetColor }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      />

      {filters.map((f, i) => {
        // Text goes white whenever the bubble covers it — including the muted
        // (greyed-out) preview state.
        const covered = i === targetIndex && ready;
        return (
          <button
            key={f.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onSelect(f.key)}
            className="relative z-10 shrink-0 rounded-full px-3 py-1.5 text-sm font-medium leading-none transition-colors"
            style={{ color: covered ? "#fff" : f.ink }}
          >
            <span className="inline-flex items-center gap-1.5 leading-none">
              <span className="flex items-center">{f.icon ?? f.label}</span>
              <span
                className="text-xs leading-none"
                style={{ opacity: covered ? 0.8 : 0.55 }}
              >
                {f.count}
              </span>
            </span>
          </button>
        );
      })}
      </div>
    </>
  );
}
