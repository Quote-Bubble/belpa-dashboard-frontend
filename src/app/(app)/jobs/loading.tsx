import PageHeader from "@/components/PageHeader";
import QuotesSkeleton from "@/components/QuotesSkeleton";

const PILL_WIDTHS = ["w-14", "w-16", "w-20", "w-9"];

/** Match Quotes loading so Jobs ↔ Quotes mode swaps don’t jump layout. */
export default function JobsLoading() {
  return (
    <>
      <PageHeader title="Jobs" />

      <div className="toolbar mb-5 flex flex-col gap-3 rounded-2xl p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 px-1 py-0.5">
          {PILL_WIDTHS.map((w, i) => (
            <div key={i} className={`skeleton h-7 ${w} rounded-full`} />
          ))}
        </div>
        <div className="skeleton h-9 w-full rounded-xl sm:w-64" />
      </div>

      <QuotesSkeleton />
    </>
  );
}
