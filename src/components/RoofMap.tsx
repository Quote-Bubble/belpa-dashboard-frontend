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
 * The tip is at the BOTTOM CENTRE of the canvas, which is where Google anchors
 * an icon given as a plain URL — "the center point of the bottom of the image",
 * not its middle. A first attempt centred the tip instead, which hung the pin
 * half an image-height above the coordinate. That is a fixed offset in SCREEN
 * pixels, so it hid itself completely when zoomed in, where 30px of screen is
 * centimetres of roof, and only showed up on zooming out, where the same 30px
 * is several houses. Matching the documented anchor keeps it exact at every
 * zoom, with no google.maps.Point to construct before the script has loaded.
 */
function pinIcon(width: number): string {
  // Natural teardrop is 36x48 with its tip at (18,48) — already bottom centre,
  // so the path is drawn at its own coordinates and the viewBox does the work.
  const height = (width * 48) / 36;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height.toFixed(1)}" viewBox="0 0 36 48">` +
    // White stroke so the pin reads against a dark roof or a bright driveway.
    // Its outer half is clipped at the very point, which is under a pixel at
    // these sizes and is the right trade for an exact anchor.
    `<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${BRAND}" stroke="#fff" stroke-width="2.5"/>` +
    `<circle cx="18" cy="18" r="7" fill="#fff"/>` +
    `</svg>`;
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
            icon={pinIcon(thumb ? 20 : 32)}
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
