import { getUser } from "@/lib/supabase/server";
import { getRoofer } from "@/lib/roofer";
import { getQuoteConfig } from "@/lib/pricing";
import PageHeader from "@/components/PageHeader";
import PricingPanel from "@/components/PricingPanel";
import NotLinkedNotice from "@/components/NotLinkedNotice";
import AllowedDomains from "@/components/AllowedDomains";

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getUser();
  const lookup = await getRoofer();

  if (lookup.status === "error") {
    return (
      <>
        <PageHeader title="Account" />
        <div className="surface rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Couldn’t load your account
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Please refresh the page and try again. If this keeps happening,
            contact support.
          </p>
        </div>
      </>
    );
  }

  if (lookup.status === "not_linked") {
    return (
      <>
        <PageHeader title="Account" />
        <NotLinkedNotice userId={user?.id ?? "unknown"} />
      </>
    );
  }

  const roofer = lookup.roofer;
  const quoteConfig = await getQuoteConfig(roofer.id);

  return (
    <>
      <PageHeader
        title="Account"
        subtitle="Your services and rates — these power your quote bubble."
      />

      <div className="surface mb-6 flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-brand-400 to-brand-600 text-xl font-semibold text-white">
            {roofer.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {roofer.name}
            </h2>
            <p className="text-sm text-muted">{user?.email ?? "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:flex sm:gap-10">
          <InfoTile label="Widget ID" value={roofer.slug} />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <strong className="font-semibold">These rates power your quote bubble.</strong>{" "}
        Homeowners only see the services you enable, priced with the numbers you
        set here.
      </div>

      <PricingPanel rooferId={roofer.id} initial={quoteConfig} />

      <div className="mt-6">
        <AllowedDomains initial={roofer.allowed_origins ?? []} />
      </div>
    </>
  );
}
