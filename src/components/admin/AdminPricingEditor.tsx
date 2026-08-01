"use client";

import { useRouter } from "next/navigation";

import PricingForm from "@/components/PricingForm";
import type { PricingProfile } from "@/lib/types";

/**
 * Reuses the roofer Account pricing form, but for a specific roofer from the
 * admin console. The upsert runs under the operator's session — admin RLS
 * (roofer_pricing_admin_all) lets it write any roofer's rates.
 */
export default function AdminPricingEditor({
  rooferId,
  initial,
}: {
  rooferId: string;
  initial: PricingProfile;
}) {
  const router = useRouter();
  return (
    <PricingForm
      rooferId={rooferId}
      initial={initial}
      onSaved={() => router.refresh()}
    />
  );
}
