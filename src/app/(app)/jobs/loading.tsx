import PageHeader from "@/components/PageHeader";

export default function JobsLoading() {
  return (
    <>
      <PageHeader title="Jobs" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="surface rounded-2xl p-4">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton mt-2 h-6 w-20 rounded" />
          </div>
        ))}
      </div>
      <div className="surface overflow-hidden rounded-2xl">
        <div className="skeleton h-10 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton mx-4 my-3 h-12 rounded-xl"
          />
        ))}
      </div>
    </>
  );
}
