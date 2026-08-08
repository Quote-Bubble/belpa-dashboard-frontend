"use client";

import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Toast from "@/components/Toast";
import { INDICATOR } from "@/lib/motion";
import { setDeployStatus } from "@/lib/admin-actions";
import type { DeployStatus } from "@/lib/types";

// We set the widget up ourselves, so it's binary: still to do, or live.
const OPTIONS: { value: DeployStatus; label: string }[] = [
  { value: "prospect", label: "To set up" },
  { value: "live", label: "Live" },
];

export default function DeployStatusControl({
  id,
  status,
  pricingReady = true,
  pricingWarning,
}: {
  id: string;
  status: DeployStatus;
  /** Soft gate — can still mark live, but warn first. */
  pricingReady?: boolean;
  pricingWarning?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);

  return (
    <>
      <div className="inline-flex rounded-full border border-line bg-white p-0.5">
        {OPTIONS.map((o) => {
          const active = o.value === status;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending || active}
              onClick={() =>
                start(async () => {
                  if (
                    o.value === "live" &&
                    !pricingReady &&
                    !window.confirm(
                      pricingWarning ||
                        "Pricing isn’t complete yet. Mark live anyway?",
                    )
                  ) {
                    return;
                  }
                  const result = await setDeployStatus(id, o.value);
                  if (result.ok) {
                    setToast({
                      message: result.message ?? "Updated.",
                      tone: "ok",
                    });
                    router.refresh();
                  } else {
                    setToast({ message: result.error, tone: "error" });
                  }
                })
              }
              className={[
                "relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 disabled:cursor-default",
                active
                  ? "text-white"
                  : "text-ink-soft hover:text-ink disabled:opacity-60",
              ].join(" ")}
            >
              {/* Slides between options instead of the fill jumping. Worth it
                  here specifically: this control changes what the roofer's
                  install actually does, and the movement is the confirmation
                  that the click registered — the request is still in flight at
                  this point, so nothing else has changed yet. */}
              {active && (
                <motion.span
                  layoutId="deploy-status-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-brand-600"
                  transition={INDICATOR}
                />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </>
  );
}
