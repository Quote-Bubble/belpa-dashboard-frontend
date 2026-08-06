"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Normalise whatever the roofer types into an ORIGIN.
 *
 * They will paste "www.example.co.uk/contact", "EXAMPLE.co.uk", or the whole
 * URL from their address bar. frame-ancestors matches on origin, so a stray
 * path or capital silently fails to match and the widget goes blank on their
 * site with nothing to explain why. Being generous here is the difference
 * between this feature being usable and being a support ticket.
 *
 * Returns null if there's nothing usable in the input.
 */
export function toOrigin(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;
  if (!/^https?:\/\//.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!url.hostname.includes(".")) return null; // "localhost", typos
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * A domain and its www counterpart are different origins to the browser, so
 * allowing one and not the other breaks half the roofer's traffic depending on
 * how their DNS resolves. We add both rather than making them think about it.
 */
function withWwwPair(origin: string): string[] {
  try {
    const url = new URL(origin);
    const bare = url.hostname.replace(/^www\./, "");
    return [
      `${url.protocol}//${bare}`,
      `${url.protocol}//www.${bare}`,
    ];
  } catch {
    return [origin];
  }
}

export default function AllowedDomains({ initial }: { initial: string[] }) {
  const [origins, setOrigins] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (next: string[]) => {
    setError(null);
    const previous = origins;
    setOrigins(next); // optimistic — reverted below if the write fails
    startTransition(async () => {
      const supabase = createClient();
      // An RPC, not a table update. Members deliberately have NO update policy
      // on `roofers`: `authenticated` holds UPDATE on every column (slug, name,
      // id …) and RLS can't restrict columns, so a member update policy would
      // also let a roofer rewrite their own slug. This SECURITY DEFINER
      // function can only ever touch allowed_origins, on the caller's own
      // roofer, and re-validates each origin server-side.
      const { data, error: writeError } = await supabase.rpc(
        "set_allowed_origins",
        { p_origins: next },
      );
      if (writeError) {
        setOrigins(previous);
        setError("Couldn't save. Please try again.");
        return;
      }
      // Trust the server's cleaned list over ours — it drops anything that
      // isn't a bare origin, so the UI shows what is actually enforced.
      if (Array.isArray(data)) setOrigins(data as string[]);
    });
  };

  const add = () => {
    const origin = toOrigin(input);
    if (!origin) {
      setError("That doesn't look like a website address.");
      return;
    }
    const merged = Array.from(new Set([...origins, ...withWwwPair(origin)]));
    setInput("");
    save(merged);
  };

  const remove = (origin: string) =>
    save(origins.filter((o) => o !== origin));

  const locked = origins.length > 0;

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="font-display text-lg font-semibold text-ink">
        Where your widget can be used
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        {locked ? (
          <>
            Your widget only loads on the sites below. Anywhere else, the
            browser blocks it.
          </>
        ) : (
          <>
            Your widget currently works on any website. Add your own domain to
            lock it to just your site.
          </>
        )}
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="yourcompany.co.uk"
          aria-label="Website address"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {origins.length > 0 && (
        <ul className="mt-4 space-y-2">
          {origins.map((origin) => (
            <li
              key={origin}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2"
            >
              <span className="truncate text-sm text-ink">{origin}</span>
              <button
                type="button"
                onClick={() => remove(origin)}
                disabled={pending}
                className="shrink-0 text-sm font-semibold text-ink-soft transition-colors hover:text-red-600 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Said plainly because the alternative is a roofer believing their
          shareable link is private. It isn't, and it can't be — that's what
          makes a QR code work. */}
      <p className="mt-4 text-xs text-muted">
        This covers the widget embedded on a website. Your shareable quote link
        and QR code keep working for anyone you send them to, by design.
      </p>
    </div>
  );
}
