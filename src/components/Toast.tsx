"use client";

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
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
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
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-9" />
              </svg>
            )}
          </span>
          {message}
        </div>
      )}
    </div>
  );
}
