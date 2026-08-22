"use client";

import { useEffect, useState } from "react";

import type { LeadPayload } from "@/lib/types";

/**
 * The front of the house, beside the roof.
 *
 * The satellite view answers "how big is the roof". This answers the questions
 * a roofer asks before deciding whether the job is worth driving to: what does
 * the frontage look like, can a lorry stop, is there anywhere to put scaffold,
 * is there a side gate. All of that is invisible from above.
 *
 * A flat image rather than an interactive panorama, deliberately. The
 * interactive Street View widget pulls in a large chunk of the Maps JS API and
 * bills as a Dynamic SKU on every panel open; the static endpoint is one image
 * request. Roofers are glancing at this, not exploring it — and the "open in
 * Google Maps" link below covers the case where they do want to look around.
 */

/** Metadata is FREE and unmetered — it says whether imagery exists before we
 *  ever request a billable image. Without this, a rural property with no
 *  coverage renders Google's grey "no imagery" placeholder, which looks like a
 *  broken feature rather than an honest absence. */
type Meta = { status: string; date?: string };

export default function StreetView({
  payload,
  address,
}: {
  payload: LeadPayload | null;
  address?: string | null;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const coords = payload?.coords ?? null;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey || !coords) return;
    let live = true;
    const url =
      `https://maps.googleapis.com/maps/api/streetview/metadata` +
      `?location=${coords.lat},${coords.lng}&key=${apiKey}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (live) setMeta(d as Meta);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [apiKey, coords]);

  if (!apiKey || !coords) return null;

  if (failed || (meta && meta.status !== "OK")) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-line bg-black/[0.02] px-4 text-center">
        <p className="text-sm text-muted">
          No street view available for this address.
        </p>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="h-full min-h-[220px] animate-pulse rounded-xl bg-black/[0.04]" />
    );
  }

  // 640x640 is the free tier's maximum without the paid scale parameter.
  const img =
    `https://maps.googleapis.com/maps/api/streetview` +
    `?size=640x400&location=${coords.lat},${coords.lng}` +
    `&fov=80&pitch=8&return_error_code=true&key=${apiKey}`;

  // Google's own viewer, for the roofer who wants to look up and down the road.
  // Cheaper than embedding an interactive panorama and more capable than one.
  const explore =
    `https://www.google.com/maps/@?api=1&map_action=pano` +
    `&viewpoint=${coords.lat},${coords.lng}`;

  const captured = meta.date
    ? new Date(`${meta.date}-01`).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative h-full min-h-[220px] overflow-hidden rounded-xl border border-line bg-[#0f1520]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={address ? `Street view of ${address}` : "Street view of the property"}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />

      {/* Capture date matters more than it looks: Street View can be years old,
          so an extension or a new driveway may simply not be there yet. */}
      {captured && (
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white/90">
          {captured}
        </span>
      )}

      <a
        href={explore}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white/90 transition-colors hover:bg-black/75"
      >
        Look around ↗
      </a>
    </div>
  );
}
