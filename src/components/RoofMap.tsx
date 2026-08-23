"use client";

import { useState } from "react";
import { APIProvider, Map, Marker, Polygon } from "@vis.gl/react-google-maps";

import RoofPlan from "@/components/RoofPlan";
import { sanitizePolygonCoords } from "@/lib/roof-plan";
import type { LeadPayload } from "@/lib/types";

/* Same values the widget draws the roof with (DrawRoofStep.tsx's BRAND, and
   its Polygon props), so the outline the roofer sees is the one the customer
   drew rather than a lookalike in different colours. */
const BRAND = "#2f6bff";

/** Widget's default when a lead carries no stored framing — close enough to
 *  read a single roof, and what the flow itself opens on. */
const FALLBACK_ZOOM = 20;

/**
 * The customer's dropped pin.
 *
 * Without it a repair lead is a satellite photograph of a street with nothing
 * saying which house was quoted — the outline used to answer that, but repairs
 * never draw one.
 *
 * The teardrop is the widget's own marker (LocateStep's SVG), so the roofer
 * sees the same pin the customer placed.
 *
 * Drawn into a SQUARE canvas with the tip dead centre, which is the whole
 * trick here: given a plain URL, Google centres the image on the coordinate.
 * A normal pin-shaped image would therefore float half its height above the
 * spot it marks, and correcting that needs google.maps.Point/Size — real
 * constructors that do not exist until the Maps script has loaded, so building
 * them during render is a race. Centring the tip sidesteps all of it.
 */
function pinIcon(pixels: number): string {
  const centre = pixels / 2;
  // Source teardrop is 36x48 with its tip at (18,48). Land that tip on the
  // canvas centre and let the balloon rise above it.
  const height = pixels * 0.47;
  const scale = height / 48;
  const x = centre - 18 * scale;
  const y = centre - height;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${pixels} ${pixels}">` +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">` +
    // White stroke so the pin reads against a dark roof or a bright driveway.
    `<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${BRAND}" stroke="#fff" stroke-width="3"/>` +
    `<circle cx="18" cy="18" r="7" fill="#fff"/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * The quote flow's satellite map, persisted to the dashboard.
 *
 * This is deliberately a live tiled map rather than a flat picture: the roofer
 * can zoom out to see the street, the neighbours and the access, while the
 * outline stays pinned to the building because it is real geometry, not pixels
 * baked into an image.
 *
 * Falls back to the static SVG plan (RoofPlan) whenever a live map can't be
 * shown — no Maps key configured, or a lead with no coordinates. That keeps
 * every lead's detail panel useful instead of leaving a hole.
 */
export default function RoofMap({
  payload,
  variant = "panel",
}: {
  payload: LeadPayload | null;
  /** "thumb" renders it in the evidence strip: same map, but frozen and
   *  chrome-free, because at that size the controls are unusable and a scroll
   *  over the strip should scroll the page rather than zoom a tile. */
  variant?: "panel" | "thumb";
}) {
  const thumb = variant === "thumb";
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const coords = payload?.coords ?? null;
  /* A key can be present and still be refused — Maps browser keys are usually
     restricted by HTTP referrer, so a key that works on the widget's origin is
     rejected on the dashboard's until that origin is added. Falling back on
     the load error means a misconfigured key degrades to the SVG plan instead
     of rendering a broken grey box. */
  const [mapsUnavailable, setMapsUnavailable] = useState(false);

  if (!apiKey || !coords || mapsUnavailable) {
    return <RoofPlan payload={payload} />;
  }

  const path = sanitizePolygonCoords(payload?.polygonCoords);
  const view = payload?.mapView ?? null;
  const center = view?.center ?? coords;
  const zoom = view?.zoom ?? FALLBACK_ZOOM;

  return (
    <div
      className={[
        "relative h-full overflow-hidden border border-line bg-[#0f1520]",
        thumb ? "rounded-lg" : "min-h-[220px] rounded-xl",
      ].join(" ")}
    >
      <APIProvider apiKey={apiKey} onError={() => setMapsUnavailable(true)}>
        <Map
          mapTypeId="satellite"
          defaultCenter={center}
          defaultZoom={zoom}
          // The roofer is inspecting, not editing: panning and zooming are the
          // point, but rotation/tilt would only let them lose the building.
          gestureHandling={thumb ? "none" : "cooperative"}
          disableDefaultUI
          zoomControl={!thumb}
          rotateControl={false}
          tiltInteractionEnabled={false}
          isFractionalZoomEnabled
          reuseMaps
          style={{ width: "100%", height: "100%" }}
        >
          {/* Where the customer dropped the pin. Kept even when an outline
              exists: the outline says how big the roof is, the pin says which
              spot they actually confirmed, and on a terrace those can differ
              by a house. Smaller in the strip, where a full-size pin would
              cover the building it is pointing at. */}
          <Marker
            position={coords}
            clickable={false}
            title="Where the customer dropped the pin"
            icon={pinIcon(thumb ? 30 : 60)}
          />

          {path.length >= 3 && (
            <Polygon
              paths={path}
              geodesic
              clickable={false}
              fillColor={BRAND}
              fillOpacity={0.22}
              strokeColor={BRAND}
              strokeOpacity={1}
              strokeWeight={3}
            />
          )}
        </Map>
      </APIProvider>

      {path.length < 3 && !thumb && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          No roof outline was drawn
        </span>
      )}
    </div>
  );
}
