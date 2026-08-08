"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Toast from "@/components/Toast";
import SegmentedControl from "@/components/SegmentedControl";
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
      <SegmentedControl
        options={OPTIONS}
        value={status}
        layoutId="deploy-status-pill"
        disabled={pending}
        ariaLabel="Deploy status"
        onChange={(next) =>
          start(async () => {
            // Confirmation lives here rather than in the control: the control
            // knows about pills, not about whether a roofer's pricing is ready
            // to go live.
            if (
              next === "live" &&
              !pricingReady &&
              !window.confirm(
                pricingWarning ||
                  "Pricing isn’t complete yet. Mark live anyway?",
              )
            ) {
              return;
            }
            const result = await setDeployStatus(id, next);
            if (result.ok) {
              setToast({ message: result.message ?? "Updated.", tone: "ok" });
              router.refresh();
            } else {
              setToast({ message: result.error, tone: "error" });
            }
          })
        }
      />
      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </>
  );
}
