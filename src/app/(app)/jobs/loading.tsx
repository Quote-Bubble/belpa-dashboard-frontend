import PageHeader from "@/components/PageHeader";
import QuotesJobsSwitcher from "@/components/QuotesJobsSwitcher";

export default function JobsLoading() {
  return (
    <>
      <QuotesJobsSwitcher />
      <PageHeader title="Jobs" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="surface rounded-2xl p-4">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton mt-2 h-6 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="surface skeleton h-64 rounded-2xl" />
    </>
  );
}
