import Link from "next/link";

export type RooferHubTab = "quotes" | "jobs" | "setup";

const TABS: { id: RooferHubTab; label: string }[] = [
  { id: "quotes", label: "Quotes" },
  { id: "jobs", label: "Jobs" },
  { id: "setup", label: "Setup" },
];

export default function RooferHubTabs({
  rooferId,
  active,
  quoteCount,
  jobCount,
}: {
  rooferId: string;
  active: RooferHubTab;
  quoteCount: number;
  jobCount: number;
}) {
  const countFor = (id: RooferHubTab) => {
    if (id === "quotes") return quoteCount;
    if (id === "jobs") return jobCount;
    return null;
  };

  return (
    <div className="mb-5 flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const selected = t.id === active;
        const count = countFor(t.id);
        return (
          <Link
            key={t.id}
            href={
              t.id === "quotes"
                ? `/admin/${rooferId}`
                : `/admin/${rooferId}?tab=${t.id}`
            }
            aria-current={selected ? "page" : undefined}
            className={[
              "relative px-3.5 py-3 text-sm font-semibold transition-colors",
              selected ? "text-ink" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2">
              {t.label}
              {count != null ? (
                <span
                  className={[
                    "min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums leading-none",
                    selected
                      ? "bg-brand-600 text-white"
                      : "bg-black/[0.06] text-ink-soft",
                  ].join(" ")}
                >
                  {count}
                </span>
              ) : null}
            </span>
            {selected && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
