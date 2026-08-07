"use client";

import { Check, X } from "lucide-react";
import { useEffect } from "react";

export default function Toast({
  message,
  tone = "ok",
  onDone,
  duration = 2800,
}: {
  message: string | null;
  tone?: "ok" | "error";
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, onDone, duration]);

  const error = tone === "error";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      // bottom-6 is 24px; an iPhone home indicator needs ~34px, so a toast
      // sat half-under it. Tailwind can't express env(), hence the style.
      style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
    >
      {message && (
        <div
          className={[
            "pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-float)]",
            error
              ? "bg-red-600 text-white"
              : "glass text-ink",
          ].join(" ")}
        >
          <span
            className={[
              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-white",
              error ? "bg-white/20" : "bg-gradient-to-b from-brand-400 to-brand-600",
            ].join(" ")}
          >
            {error ? (
              <X size={12} strokeWidth={3} aria-hidden />
            ) : (
              <Check size={12} strokeWidth={2.25} aria-hidden />
            )}
          </span>
          {message}
        </div>
      )}
    </div>
  );
}
