import Link from "next/link";
import { notFound } from "next/navigation";

import DeployStatusControl from "@/components/admin/DeployStatusControl";
import DeleteRooferButton from "@/components/admin/DeleteRooferButton";
import InstallSnippets from "@/components/admin/InstallSnippets";
import AdminPricingEditor from "@/components/admin/AdminPricingEditor";
import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import { linkRooferLogin, updateRoofer } from "@/lib/admin-actions";
import {
  buttonSnippet,
  hostedLink,
  previewButton,
  previewWidget,
  widgetSnippet,
} from "@/lib/embed-snippets";
import type { RooferAdminRow } from "@/lib/types";

const field =
  "field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted";
const label = "mb-1.5 block text-xs font-medium text-ink-soft";

export default async function RooferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("roofers")
    .select(
      "id,slug,name,website,contact_name,contact_phone,deploy_status,created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const roofer = data as RooferAdminRow;

  const { data: memberRows } = await supabase.rpc("admin_roofer_members", {
    p_roofer_id: roofer.id,
  });
  const members = (memberRows ?? []) as { email: string }[];

  const pricing = await getPricing(roofer.id);
  const added = new Date(roofer.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        ← Roofers
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {roofer.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono">/{roofer.slug}</span> · Added {added}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <span className="text-xs font-medium text-muted">Deploy status</span>
          <DeployStatusControl id={roofer.id} status={roofer.deploy_status} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Install — one tabbed snippet instead of three stacked blocks */}
        <section className="surface min-w-0 rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Install</h2>
          <InstallSnippets
            slug={roofer.slug}
            button={buttonSnippet(roofer.slug)}
            widget={widgetSnippet(roofer.slug)}
            link={hostedLink(roofer.slug)}
            preview={{
              button: previewButton(roofer.slug),
              widget: previewWidget(roofer.slug),
              link: hostedLink(roofer.slug),
            }}
          />
        </section>

        {/* Details */}
        <section className="surface h-fit min-w-0 rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Details</h2>
          <form
            action={updateRoofer.bind(null, roofer.id)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className={label} htmlFor="name">
                Company name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={roofer.name}
                className={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="website">
                Website
              </label>
              <input
                id="website"
                name="website"
                defaultValue={roofer.website ?? ""}
                placeholder="https://…"
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="contact_name">
                Contact
              </label>
              <input
                id="contact_name"
                name="contact_name"
                defaultValue={roofer.contact_name ?? ""}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="contact_phone">
                Phone
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                defaultValue={roofer.contact_phone ?? ""}
                className={field}
              />
            </div>
            <div className="flex justify-end pt-1 sm:col-span-2">
              <button
                type="submit"
                className="btn-primary rounded-full px-5 py-2 text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Pricing — their own rates drive their widget's quotes */}
      <section className="surface mt-6 rounded-2xl p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Pricing</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Set this roofer’s own rates — their widget prices quotes from these
          instead of the defaults. Leave as-is to keep the standard model.
        </p>
        <AdminPricingEditor rooferId={roofer.id} initial={pricing} />
      </section>

      {/* Access — link the roofer's login so they see their leads */}
      <section className="surface mt-6 rounded-2xl p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Access</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Link the roofer’s login (the email they signed up with) so they see
          their own leads.
        </p>
        {members.length > 0 ? (
          <ul className="mb-3 flex flex-wrap gap-2">
            {members.map((m) => (
              <li
                key={m.email}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
              >
                {m.email}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs text-muted">No logins linked yet.</p>
        )}
        <form
          action={linkRooferLogin.bind(null, roofer.id)}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="roofer@email.co.uk"
            className={`${field} sm:max-w-xs`}
          />
          <button
            type="submit"
            className="btn-ghost rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            Link login
          </button>
        </form>
      </section>

      {/* Delete — slim inline row, not a giant card */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/80 px-4 py-3">
        <p className="text-xs text-muted">
          Deleting removes their leads and pricing too.
        </p>
        <DeleteRooferButton id={roofer.id} name={roofer.name} />
      </div>
    </div>
  );
}
