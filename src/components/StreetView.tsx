"use client";

import { useEffect, useState } from "react";

import {
  MAX_CAMERA_DISTANCE_M,
  distanceM,
  streetViewUrl,
  type LatLng,
} from "@/lib/streetview";
import type { LeadPayload } from "@/lib/types";

/**
 * The front of the house, beside the roof.
 *
 * The satellite view answers "how big is the roof". This answers what a roofer
 * asks before deciding whether the job is worth driving to: what does the
 * frontage look like, can a lorry stop, is there scaffold room, is there a side
 * gate. None of that is visible from above.
 *
 * Aiming is the whole difficulty. `location=lat,lng` snaps to the nearest
 * panorama out in the road and then faces whichever way the camera van was
 * pointing, so the first version of this showed neighbours and hedges. The
 * metadata response carries the panorama's own coordinates, so we compute the
 * bearing to the house and pin the exact panorama by id — see lib/streetview.
 *
 * A flat image rather than the interactive panorama, deliberately: the
 * interactive widget pulls in a large chunk of Maps JS and bills as a Dynamic
 * SKU on every panel open. Roofers glance at this; the "Look around" link
 * covers the times they want more.
 */

type Meta = {
  status: string;
  date?: string;
  pano_id?: string;
  location?: { lat: number; lng: number };
};

export default function StreetView({
  payload,
  address,
}: {
  payload: LeadPayload | null;
  address?: string | null;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const coords = (payload?.coords ?? null) as LatLng | null;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey || !coords) return;
    let live = true;
    // Metadata is a separate SKU with unlimited free usage, so this costs
    // nothing and tells us three things before we request a billable image:
    // whether coverage exists, exactly which panorama, and where it stands.
    const url =
      `https://maps.googleapis.com/maps/api/streetview/metadata` +
      `?location=${coords.lat},${coords.lng}&source=outdoor&key=${apiKey}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => live && setMeta(d as Meta))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [apiKey, coords]);

  if (!apiKey || !coords) return null;

  if (!meta && !failed) {
    return (
      <div className="h-full animate-pulse rounded-xl bg-black/[0.04]" />
    );
  }

  const camera = meta?.location ?? null;
  const away = camera ? distanceM(camera, coords) : null;

  // Three ways this legitimately has nothing to show. Saying so is better than
  // a confident photograph of the wrong building, which is what a roofer would
  // actually act on.
  const unavailable =
    failed ||
    !meta ||
    meta.status !== "OK" ||
    !meta.pano_id ||
    !camera ||
    (away !== null && away > MAX_CAMERA_DISTANCE_M);

  if (unavailable) {
    const tooFar = away !== null && away > MAX_CAMERA_DISTANCE_M;
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-line bg-black/[0.02] px-4 text-center">
        <p className="text-sm text-muted">
          {tooFar
            ? `Nearest street imagery is ${Math.round(away!)}m away, too far to show this property.`
            : "No street view available for this address."}
        </p>
      </div>
    );
  }

  const img = streetViewUrl({
    panoId: meta!.pano_id!,
    house: coords,
    camera: camera!,
    key: apiKey,
  });

  const explore =
    `https://www.google.com/maps/@?api=1&map_action=pano` +
    `&viewpoint=${coords.lat},${coords.lng}`;

  const captured = meta!.date
    ? new Date(`${meta!.date}-01`).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-line bg-[#0f1520]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={
          address ? `Street view of ${address}` : "Street view of the property"
        }
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />

      {/* Which house.
          A street photo can hold four or five properties, and until now nothing
          said which one was quoted. Street View Static has no marker parameter,
          but it does not need one: the camera is aimed at the property by
          computed bearing, so the quoted house is at the horizontal centre of
          the frame BY CONSTRUCTION. The marker just makes that legible.

          It hangs from the top edge rather than sitting on the building, so it
          points without covering the frontage, the roofline or the driveway —
          the things the photo exists to show. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        aria-hidden="true"
      >
        <svg width="30" height="74" viewBox="0 0 30 74" fill="none">
          {/* Dark stroke under every shape: this sits over uncontrolled
              photography and has to read against a bright sky or a dark hedge. */}
          <line
            x1="15"
            y1="0"
            x2="15"
            y2="40"
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="4"
          />
          <line
            x1="15"
            y1="0"
            x2="15"
            y2="40"
            stroke="#2f6bff"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <path
            d="M15 62 L9.5 50 A7.5 7.5 0 1 1 20.5 50 Z"
            fill="#2f6bff"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="2.5"
          />
          <circle cx="15" cy="44" r="2.6" fill="#fff" />
        </svg>
      </div>

      {/* Capture date matters: Street View is often years old, so an extension
          or a new driveway may simply not be in the picture yet. */}
      <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white/90">
        {captured && <span>{captured}</span>}
        {away !== null && (
          <>
            {captured && <span className="text-white/40">·</span>}
            {/* How far the camera stands from the pin. A roofer who thinks the
                photo looks wrong can tell at a glance whether it is a bad aim
                or simply a distant viewpoint. */}
            <span>{Math.round(away)}m away</span>
          </>
        )}
      </span>

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
