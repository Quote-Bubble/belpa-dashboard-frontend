"use client";

import { useTransition } from "react";

import { setDeployStatus } from "@/lib/admin-actions";
import type { DeployStatus } from "@/lib/types";

// Deploy pipeline in plain terms: added but not deployed → snippet handed over,
// awaiting go-live → widget confirmed live on their site.
const OPTIONS: { value: DeployStatus; label: string }[] = [
  { value: "prospect", label: "To set up" },
  { value: "sent", label: "Sent" },
  { value: "live", label: "Live" },
];

export default function DeployStatusControl({
  id,
  status,
}: {
  id: string;
  status: DeployStatus;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex rounded-full border border-line bg-white p-0.5">
      {OPTIONS.map((o) => {
        const active = o.value === status;
        return (
          <button
            key={o.value}
            type="button"
            disabled={pending || active}
            onClick={() => start(() => setDeployStatus(id, o.value))}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default",
              active
                ? "bg-brand-600 text-white"
                : "text-ink-soft hover:text-ink disabled:opacity-60",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
