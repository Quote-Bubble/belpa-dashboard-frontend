import PageHeader from "@/components/PageHeader";
import QuotesSkeleton from "@/components/QuotesSkeleton";

const PILL_WIDTHS = ["w-16", "w-16", "w-24", "w-16", "w-16", "w-9"];

/** Shaped to match QuotesClient's real toolbar + table exactly, so the swap
 *  in is a shimmer-to-content fade rather than a layout jump. */
export default function QuotesLoading() {
  return (
    <>
      <PageHeader title="Quotes" />

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
