import Link from "next/link";
import { notFound } from "next/navigation";

import DeployStatusControl from "@/components/admin/DeployStatusControl";
import DeleteRooferButton from "@/components/admin/DeleteRooferButton";
import RooferPanel from "@/components/admin/RooferPanel";
import { createClient } from "@/lib/supabase/server";
import { linkRooferLogin, updateRoofer } from "@/lib/admin-actions";
import {
  buttonSnippet,
  hostedLink,
  previewButton,
  previewWidget,
  widgetSnippet,
} from "@/lib/embed-snippets";
import type { RooferAdminRow } from "@/lib/types";

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
  const added = new Date(roofer.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl">
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

      <RooferPanel
        install={{
          slug: roofer.slug,
          button: buttonSnippet(roofer.slug),
          widget: widgetSnippet(roofer.slug),
          link: hostedLink(roofer.slug),
          preview: {
            button: previewButton(roofer.slug),
            widget: previewWidget(roofer.slug),
            link: hostedLink(roofer.slug),
          },
        }}
        details={{
          name: roofer.name,
          website: roofer.website ?? "",
          contactName: roofer.contact_name ?? "",
          contactPhone: roofer.contact_phone ?? "",
        }}
        members={members}
        updateAction={updateRoofer.bind(null, roofer.id)}
        linkAction={linkRooferLogin.bind(null, roofer.id)}
      />

      {/* Delete — quiet footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-muted">
          Deleting removes their leads and pricing too.
        </p>
        <DeleteRooferButton id={roofer.id} name={roofer.name} />
      </div>
    </div>
  );
}
