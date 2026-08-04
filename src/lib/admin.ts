import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Whether the signed-in user is a Belpa operator (a row in `admins`). Deduped
 * per request. RLS (`admins_select_self`) means this query can only ever return
 * the caller's own row, so a hit == admin. Non-admins get an empty result, not
 * an error.
 */
export const isAdmin = cache(async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .maybeSingle();
  return Boolean(data);
});
