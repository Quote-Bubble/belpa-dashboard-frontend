import PageHeader from "@/components/PageHeader";

function Bar({ w, tall }: { w: string; tall?: boolean }) {
  return (
    <div
      className={`skeleton rounded-md ${tall ? "h-4" : "h-3.5"}`}
      style={{ width: w }}
    />
  );
}

function Section({
  titleW,
  descW,
  children,
}: {
  titleW: string;
  descW: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-2xl p-5 sm:p-6">
      <Bar w={titleW} tall />
      <div className="mt-2">
        <Bar w={descW} />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Shaped to match AccountPage's real profile card + PricingForm sections, so
 *  revisiting this page reads as instant rather than a re-fetch. */
export default function AccountLoading() {
  return (
    <>
      <PageHeader
        title="Account"
        subtitle="Your rates, stored against your company."
      />

      {/* Profile summary */}
      <div className="surface mb-6 flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <div className="skeleton h-14 w-14 shrink-0 rounded-2xl" />
          <div className="space-y-2">
            <Bar w="140px" tall />
            <Bar w="180px" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:flex sm:gap-10">
          <div className="space-y-2">
            <Bar w="64px" />
            <Bar w="120px" tall />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <strong className="font-semibold">These rates power your quote bubble.</strong>
      </div>

      <div className="space-y-5">
        <Section
          titleW="90px"
          descW="min(280px, 100%)"
        >
          <div className="divide-y divide-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-3"
              >
                <Bar w="120px" />
                <div className="skeleton h-9 w-40 rounded-xl" />
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ["100px", "170px"],
            ["150px", "160px"],
            ["90px", "180px"],
            ["80px", "130px"],
          ].map(([titleW, descW], i) => (
            <Section key={i} titleW={titleW} descW={descW}>
              <div className="skeleton h-9 w-full max-w-[220px] rounded-xl" />
            </Section>
          ))}
        </div>

        <Section titleW="40px" descW="min(300px, 100%)">
          <div className="flex items-center gap-3">
            <div className="skeleton h-4 w-4 rounded" />
            <Bar w="min(320px, 100%)" />
          </div>
        </Section>
      </div>
    </>
  );
}
