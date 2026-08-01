import type { DeployStatus } from "@/lib/types";

const MAP: Record<DeployStatus, { label: string; className: string }> = {
  prospect: { label: "To set up", className: "bg-black/[0.05] text-ink-soft" },
  sent: { label: "Sent", className: "bg-amber-100 text-amber-800" },
  live: { label: "Live", className: "bg-green-100 text-green-700" },
};

export default function DeployBadge({ status }: { status: DeployStatus }) {
  const s = MAP[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}
