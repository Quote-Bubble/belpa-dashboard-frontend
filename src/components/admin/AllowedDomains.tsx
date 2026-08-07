"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Reduce anything an operator pastes to an ORIGIN.
 *
 * frame-ancestors matches on origin, so a stray path or a capital letter
 * silently fails to match and the roofer's widget goes blank on their own site
 * with nothing on screen to explain why. Whatever gets pasted — the whole
 * address bar, a contact page, a bare domain — has to land as scheme + host.
 */
export function toOrigin(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;
  if (!/^https?:\/\//.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!url.hostname.includes(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * A bare domain and its www form are different origins to a browser. Allowing
 * one and not the other breaks whichever half of the roofer's traffic resolves
 * to the other, which is a miserable thing to debug later — so both go in.
 */
function withWwwPair(origin: string): string[] {
  try {
    const url = new URL(origin);
    const bare = url.hostname.replace(/^www\./, "");
    return [`${url.protocol}//${bare}`, `${url.protocol}//www.${bare}`];
  } catch {
    return [origin];
  }
}

export default function AllowedDomains({
  rooferId,
  initial,
  website,
}: {
  rooferId: string;
  initial: string[];
  /** From the roofer's Details tab — offered as a one-click lock. */
  website?: string | null;
}) {
  const [origins, setOrigins] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (next: string[]) => {
    setError(null);
    const previous = origins;
    setOrigins(next); // optimistic; rolled back if the write fails
    startTransition(async () => {
      const supabase = createClient();
      // RPC rather than a table update: the function re-validates every entry
      // server-side, and these strings go straight into a response header.
      const { data, error: writeError } = await supabase.rpc(
        "set_allowed_origins",
        { p_roofer_id: rooferId, p_origins: next },
      );
      if (writeError) {
        setOrigins(previous);
        setError(writeError.message || "Couldn't save.");
        return;
      }
      // Show what the server kept, not what we sent — so the list on screen is
      // the list actually being enforced.
      if (Array.isArray(data)) setOrigins(data as string[]);
    });
  };

  const addOrigin = (raw: string) => {
    const origin = toOrigin(raw);
    if (!origin) {
      setError("That doesn't look like a website address.");
      return;
    }
    setInput("");
    save(Array.from(new Set([...origins, ...withWwwPair(origin)])));
  };

  const suggested = website ? toOrigin(website) : null;
  const suggestionUsed =
    suggested !== null &&
    withWwwPair(suggested).every((o) => origins.includes(o));

  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-sm font-semibold text-ink">Lock to their site</h3>

      {suggested && !suggestionUsed && (
        <button
          type="button"
          onClick={() => addOrigin(suggested)}
          disabled={pending}
          className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
        >
          Use {suggested.replace(/^https?:\/\//, "")}
        </button>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOrigin(input);
            }
          }}
          placeholder="theircompany.co.uk"
          aria-label="Allowed website"
          className="field min-w-0 flex-1 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => addOrigin(input)}
          disabled={pending}
          className="btn-ghost shrink-0 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {origins.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {origins.map((origin) => (
            <li
              key={origin}
              className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f8fa] px-3 py-1.5"
            >
              <span className="truncate text-xs text-ink">{origin}</span>
              <button
                type="button"
                onClick={() => save(origins.filter((o) => o !== origin))}
                disabled={pending}
                className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-red-600 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
