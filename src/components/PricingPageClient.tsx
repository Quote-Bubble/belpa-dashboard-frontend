"use client";

import { useRouter } from "next/navigation";

import QuoteConfigEditor from "@/components/QuoteConfigEditor";
import type { QuoteConfig } from "@/lib/quote-config";

/** Client wrapper so save can refresh the server page. */
export default function PricingPageClient({
  rooferId,
  initial,
  previewUrl,
}: {
  rooferId: string;
  initial: QuoteConfig;
  previewUrl?: string;
}) {
  const router = useRouter();
  return (
    <QuoteConfigEditor
      rooferId={rooferId}
      initial={initial}
      previewUrl={previewUrl}
      onSaved={() => router.refresh()}
    />
  );
}
