"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import Toast from "@/components/Toast";
import { EASE_SOFT, POPOVER_TRANSITION } from "@/lib/motion";
import { createRoofer } from "@/lib/admin-actions";
import type { ActionResult } from "@/lib/action-result";

const field =
  "field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted";
const labelCls = "mb-1.5 block text-xs font-medium text-ink-soft";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary rounded-full px-5 py-2 text-sm font-semibold"
    >
      {pending ? "Adding…" : "Add roofer"}
    </button>
  );
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export default function AddRoofer() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);

  const handleAction = async (formData: FormData) => {
    try {
      const result: ActionResult = await createRoofer(formData);
      if (!result.ok) {
        setToast({ message: result.error, tone: "error" });
      }
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setToast({
        message: "Couldn’t create that roofer. Please try again.",
        tone: "error",
      });
    }
  };

  return (
    <div className="surface mb-6 overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span
            className={`grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600 transition-transform duration-300 ${
              open ? "rotate-45" : ""
            }`}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-ink">Add a roofer</span>
        </span>
        {/* Flips to point up while the form is open. The chevron is the only
            thing on this row indicating state, and leaving it pointing down at
            an already-open form quietly says the opposite of what is true. */}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={POPOVER_TRANSITION}
          className="inline-flex"
        >
          <ChevronDown size={14} strokeWidth={2} aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_SOFT }}
            className="overflow-hidden"
          >
            <form
              action={handleAction}
              className="grid gap-3 border-t border-line px-5 py-5 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="name">
                  Company name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  autoFocus
                  placeholder="Ridgeway Roofing"
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="website">
                  Website <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="website"
                  name="website"
                  placeholder="https://ridgewayroofing.co.uk"
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="contact_name">
                  Contact <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="contact_name"
                  name="contact_name"
                  placeholder="Dave"
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="contact_phone">
                  Phone <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  placeholder="07700 900123"
                  className={field}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost rounded-full px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <SubmitButton />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
