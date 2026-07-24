import { cache } from "react";
import type { RooferProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type RooferLookup =
  | { status: "ok"; roofer: RooferProfile }
  | { status: "not_linked" }
  | { status: "error" };

/**
 * The roofer company the signed-in user belongs to.
 *
 * No filtering happens here on purpose: the `roofers_select_member` RLS policy
 * (supabase/migrations/0001_init.sql) already restricts this to companies the
 * caller is a member of via `roofer_members`. An empty result therefore means
 * "this account isn't linked to a roofer yet" — the expected state for a fresh
 * signup. A query failure is a separate `error` status so pages don't tell a
 * paying roofer their account isn't linked after a transient blip.
 *
 * Deduped via `cache()`: the layout and the page below it both need this, and
 * without caching each one would re-query it independently per request.
 */
export const getRoofer = cache(async function getRoofer(): Promise<RooferLookup> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roofers")
    .select("id,slug,name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { status: "error" };
  if (!data) return { status: "not_linked" };
  return { status: "ok", roofer: data as RooferProfile };
});
