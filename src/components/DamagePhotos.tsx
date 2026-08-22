"use client";

/**
 * Customer-supplied damage photos on the lead detail panel.
 *
 * The bucket is private, so nothing here is a public URL: each render mints
 * short-lived signed URLs, which expire long before they could be shared
 * usefully. Storage RLS (migration 0019) is the real boundary — this is the
 * convenience layer, not the security one.
 *
 * Plain <img> rather than next/image, matching the rest of the app: the repo
 * has never used next/image and remote sources would need an images.
 * remotePatterns entry that does not exist.
 */
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "lead-photos";
const SIGNED_URL_TTL_SECONDS = 600;

export function DamagePhotos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (paths.length === 0) return;
    let cancelled = false;

    void createClient()
      .storage.from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setFailed(true);
          return;
        }
        setUrls(
          data
            .map((d) => d.signedUrl)
            .filter((u): u is string => typeof u === "string"),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (paths.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Customer photos
      </p>

      {failed ? (
        <p className="text-sm text-muted">
          Couldn&apos;t load the photos just now.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(urls ?? paths).map((item, index) =>
            urls ? (
              <a
                key={item}
                href={item}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-xl border border-line bg-black/[0.04]"
                title="Open full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item}
                  alt={`Customer damage photo ${index + 1}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </a>
            ) : (
              <div
                key={item}
                className="aspect-square w-full animate-pulse rounded-xl bg-black/[0.04]"
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
