import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import DeployStatusControl from "@/components/admin/DeployStatusControl";
import DeleteRooferButton from "@/components/admin/DeleteRooferButton";
import SnippetBlock from "@/components/admin/SnippetBlock";
import { createClient } from "@/lib/supabase/server";
import { updateRoofer } from "@/lib/admin-actions";
import {
  buttonSnippet,
  hostedLink,
  widgetSnippet,
} from "@/lib/embed-snippets";
import type { RooferAdminRow } from "@/lib/types";

const field =
  "field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted";
const label = "mb-1.5 block text-sm font-medium text-ink";

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
  const link = hostedLink(roofer.slug);

  return (
    <div>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        ← Roofers
      </Link>

      <PageHeader title={roofer.name} subtitle={`/${roofer.slug}`}>
        <DeployStatusControl id={roofer.id} status={roofer.deploy_status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Install — the operator copies these onto the roofer's site */}
        <section className="surface rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Install</h2>
          <div className="space-y-5">
            <SnippetBlock
              title="Button (fullscreen)"
              hint="A button anywhere on their site opens the quote flow fullscreen."
              code={buttonSnippet(roofer.slug)}
            />
            <SnippetBlock
              title="Inline widget"
              hint="Drops the quote flow straight into the page, already expanded."
              code={widgetSnippet(roofer.slug)}
            />
            <SnippetBlock
              title="Direct link (no website needed)"
              hint="Share over WhatsApp, in their Google Business Profile, or as a QR."
              code={link}
            />
          </div>
        </section>

        {/* Details */}
        <section className="surface h-fit rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Details</h2>
          <form action={updateRoofer.bind(null, roofer.id)} className="grid gap-3">
            <div>
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
            <div>
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
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="btn-ghost rounded-full px-4 py-2 text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Danger zone */}
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <h2 className="mb-1 text-sm font-semibold text-red-700">Danger zone</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Removing a roofer deletes their leads and pricing too.
        </p>
        <DeleteRooferButton id={roofer.id} name={roofer.name} />
      </section>
    </div>
  );
}
