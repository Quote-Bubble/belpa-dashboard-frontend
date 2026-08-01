"use client";

import QuoteConfigEditor from "@/components/QuoteConfigEditor";
import type { QuoteConfig } from "@/lib/quote-config";

/** Client wrapper so the Account page itself can stay a server component. */
export default function PricingPanel({
  rooferId,
  initial,
}: {
  rooferId: string;
  initial: QuoteConfig;
}) {
  return <QuoteConfigEditor rooferId={rooferId} initial={initial} />;
}
