"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Short-lived signed URLs for a lead's damage photos.
 *
 * The bucket is private, so nothing here is a public URL. Storage RLS is the
 * real boundary (migration 0020) — this is the convenience layer.
 *
 * Lifted out of the old DamagePhotos component because two things now need the
 * same URLs: the thumbnail strip and the full-screen viewer. Signing twice
 * would double the requests and hand the two of them different tokens.
 */

const BUCKET = "lead-photos";
const SIGNED_URL_TTL_SECONDS = 600;

export type SignedPhotos =
  | { state: "loading" }
  | { state: "ready"; urls: string[] }
  | { state: "failed" };

const NONE: SignedPhotos = { state: "ready", urls: [] };
const LOADING: SignedPhotos = { state: "loading" };

export function useSignedPhotos(paths: string[]): SignedPhotos {
  /* Callers build this array inline — (damage?.photoPaths ?? []).filter(...) —
     so it is a fresh reference on every render. Depending on the array itself
     re-ran the effect each render, re-signed the URLs, set state, and rendered
     again: an endless request loop against Storage. Depend on the contents,
     which only change when the lead does. */
  const key = paths.join(" ");

  /* Stored against the key it was fetched for, so "these URLs are stale"
     is derived rather than assigned. Resetting to loading with a setState
     inside the effect would work, but it is the cascading-render pattern the
     lint rule exists to catch — and this reads more directly anyway. */
  const [entry, setEntry] = useState<{ key: string; value: SignedPhotos }>();

  useEffect(() => {
    if (paths.length === 0) return;
    let cancelled = false;

    void createClient()
      .storage.from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setEntry({ key, value: { state: "failed" } });
          return;
        }
        /* Per-item failures do not surface as `error`. createSignedUrls returns
           200 with a null signedUrl and a per-path message when Storage RLS
           refuses a file, so the top-level error is null and this reads as
           success. Filtering the nulls away then renders an empty strip with no
           explanation, which looks like a broken feature rather than photos
           that could not be loaded. */
        const urls = data
          .map((d) => d.signedUrl)
          .filter((u): u is string => typeof u === "string");
        setEntry({
          key,
          value:
            urls.length === 0 ? { state: "failed" } : { state: "ready", urls },
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (paths.length === 0) return NONE;
  return entry?.key === key ? entry.value : LOADING;
}
