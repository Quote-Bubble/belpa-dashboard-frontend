"use client";

import { useRouter } from "next/navigation";

import QuoteConfigEditor from "@/components/QuoteConfigEditor";
import type { QuoteConfig } from "@/lib/quote-config";

/** Client wrapper so save can refresh the server page. */
export default function PricingPageClient({
  rooferId,
  initial,
  allowedOrigins,
  showOrigins,
  previewUrl,
}: {
  rooferId: string;
  initial: QuoteConfig;
  allowedOrigins?: string[];
  showOrigins?: boolean;
  previewUrl?: string;
}) {
  const router = useRouter();
  return (
    <QuoteConfigEditor
      rooferId={rooferId}
      initial={initial}
      allowedOrigins={allowedOrigins}
      showOrigins={showOrigins}
      previewUrl={previewUrl}
      onSaved={() => router.refresh()}
    />
  );
}
