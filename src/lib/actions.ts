"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/supabase/server";

/**
 * Quotes mutates leads via a direct client-side Supabase call (for instant
 * optimistic UI), which bypasses Next's Data/Router Cache entirely — so the
 * Analytics page, cached client-side via `staleTimes`, kept showing pre-edit
 * numbers until a manual refresh. Called right after a successful mutation,
 * this invalidates the cached copy so the next navigation (or a background
 * prefetch) picks up fresh data instead of serving the stale one.
 */
export async function revalidateAnalytics() {
  const user = await getUser();
  if (!user) return;

  revalidatePath("/analytics");
}
