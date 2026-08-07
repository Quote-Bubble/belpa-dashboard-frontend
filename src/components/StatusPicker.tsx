"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import type { LeadStatus } from "@/lib/types";
import { statusColor, statusLabel, STATUS_ORDER } from "@/lib/format";
import { POPOVER_TRANSITION, popoverVariants } from "@/lib/motion";

const MENU_WIDTH = 148;

export default function StatusPicker({
  status,
  onChange,
}: {
  status: LeadStatus;
  onChange: (next: LeadStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - MENU_WIDTH - 12);
    setCoords({ top: r.bottom + 6, left: Math.max(12, left) });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    // Any scroll (table, page) or resize repositions/closes the menu.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const current = statusColor(status);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) place();
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-xs font-semibold transition-[background-color,color] duration-300 active:scale-95"
        style={{ color: current.fg, backgroundColor: current.bg }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {statusLabel(status)}
          </motion.span>
        </AnimatePresence>
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.ul
                ref={menuRef}
                role="listbox"
                variants={popoverVariants}
                initial="hidden"
                animate="shown"
                exit="hidden"
                transition={POPOVER_TRANSITION}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  width: MENU_WIDTH,
                  transformOrigin: "top",
                  zIndex: 80,
                }}
                className="surface overflow-hidden rounded-xl p-1 shadow-[var(--shadow-float)]"
              >
                {STATUS_ORDER.map((s) => {
                  const c = statusColor(s);
                  const active = s === status;
                  return (
                    <li key={s}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onChange(s);
                          setOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-black/[0.04]"
                        style={{ color: c.fg }}
                      >
                        <span>{statusLabel(s)}</span>
                        {active && (
                          <Check size={14} strokeWidth={2} aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
