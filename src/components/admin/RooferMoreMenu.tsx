"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import Toast from "@/components/Toast";
import { deleteRoofer } from "@/lib/admin-actions";

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

/**
 * Quiet ⋯ menu for destructive / rare ops on a roofer workspace.
 */
export default function RooferMoreMenu({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
        className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      {open && (
        <div className="surface absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl py-1 shadow-lg shadow-black/10">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Delete roofer
            </button>
          ) : (
            <div className="px-3.5 py-3">
              <p className="text-xs leading-relaxed text-ink-soft">
                Delete <span className="font-semibold text-ink">{name}</span>?
                Leads and pricing go too. Can’t be undone.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      try {
                        const result = await deleteRoofer(id);
                        if (!result.ok) {
                          setToast({ message: result.error, tone: "error" });
                          setOpen(false);
                          setConfirming(false);
                        }
                      } catch (err) {
                        if (isRedirectError(err)) throw err;
                        setToast({
                          message: "Couldn’t delete that roofer.",
                          tone: "error",
                        });
                        setOpen(false);
                        setConfirming(false);
                      }
                    })
                  }
                  className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
