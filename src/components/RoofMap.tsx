"use client";

import { useState } from "react";
import { APIProvider, Map, Marker, Polygon } from "@vis.gl/react-google-maps";

import RoofPlan from "@/components/RoofPlan";
import { sanitizePolygonCoords } from "@/lib/roof-plan";
import type { LatLng, LeadPayload, SolarSegment } from "@/lib/types";

/* Same values the widget draws the roof with (DrawRoofStep.tsx's BRAND, and
   its Polygon props), so the outline the roofer sees is the one the customer
   drew rather than a lookalike in different colours. */
const BRAND = "#2f6bff";
const AFFECTED = "#ef4444";
/** The scan's bounding box, when nobody traced anything. White and faint, so
 *  it never passes for a measured outline. */
const DETECTED = "#ffffff";

/** Widget's default when a lead carries no stored framing — close enough to
 *  read a single roof, and what the flow itself opens on. */
const FALLBACK_ZOOM = 20;

/** A Solar segment's bounds as a closed ring, or null if the box is not whole.
 *  Every corner has to be a real number: a partial box would render as a
 *  sliver somewhere off the coast of Africa rather than fail visibly. */
function ringFromBounds(
  box: NonNullable<SolarSegment["boundingBox"]> | null | undefined,
): LatLng[] | null {
  const { north, south, east, west } = box ?? {};
  if (
    typeof north !== "number" ||
    typeof south !== "number" ||
    typeof east !== "number" ||
    typeof west !== "number"
  ) {
    return null;
  }
  return [
    { lat: north, lng: west },
    { lat: north, lng: east },
    { lat: south, lng: east },
    { lat: south, lng: west },
  ];
}

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
export default function RoofMap({ payload }: { payload: LeadPayload | null }) {
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

  const roofPath = sanitizePolygonCoords(payload?.polygonCoords);
  const affectedPath = sanitizePolygonCoords(payload?.affectedArea);
  const view = payload?.mapView ?? null;
  const center = view?.center ?? coords;
  const zoom = view?.zoom ?? FALLBACK_ZOOM;

  /* Did anyone actually trace this, or is it the scan's bounding box?
   *
   * Detached houses and bungalows skip the drawing step — the Solar scan
   * already covers the whole building, so there is nothing for the customer to
   * trace. But the widget still stores a polygon for them: pathFromBounds() of
   * the scan's bounding box. Rendered in the same confident blue as a traced
   * outline, that put a neat rectangle over a house, corners out in the garden,
   * looking exactly like a measurement of a roof that is not that shape. */
  const detectedOnly = payload?.solar?.measurementMethod === "solar_whole_roof";

  /* So draw the planes instead of the box around them.
   *
   * The scan does not only report an envelope — it reports every roof plane it
   * found, each with its own extent, pitch and azimuth, and those planes ARE
   * the estimate: the area is their ground areas, each multiplied by its own
   * pitch, then calibrated. The widget has stored them on every lead all
   * along; the dashboard just never read them and fell back to the one
   * rectangle instead.
   *
   * Each plane is still an axis-aligned box rather than a true outline, but a
   * set of them follows the shape of a roof closely — hips, gables and
   * extensions show up as separate planes — where a single rectangle around
   * the lot never could. */
  const planes: LatLng[][] = detectedOnly
    ? (payload?.solar?.segments ?? [])
        .map((segment) => ringFromBounds(segment?.boundingBox))
        .filter((ring): ring is LatLng[] => ring !== null)
    : [];

  // No min-height: this now sits in an aspect-ratio box beside the street
  // view, and a floor would make the two tiles different heights.
  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-line bg-[#0f1520]">
      <APIProvider apiKey={apiKey} onError={() => setMapsUnavailable(true)}>
        <Map
          mapTypeId="satellite"
          defaultCenter={center}
          defaultZoom={zoom}
          // The roofer is inspecting, not editing: scroll-wheel zoom should
          // just work. `cooperative` put up the "use ctrl + scroll" overlay.
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
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
            icon={pinIcon(28)}
          />

          {/* Roof planes from the scan, when nobody traced an outline. Drawn
              in the brand colour and not apologised for: this is the measured
              geometry the price came from, unlike the envelope it replaces.

              One polygon each rather than a single multi-path polygon —
              Google fills those by the even-odd rule, so anywhere two planes
              overlapped would punch a hole through the roof. */}
          {planes.map((ring, i) => (
            <Polygon
              key={i}
              paths={ring}
              geodesic
              clickable={false}
              fillColor={BRAND}
              fillOpacity={0.16}
              strokeColor={BRAND}
              strokeOpacity={0.95}
              strokeWeight={2}
            />
          ))}

          {/* The customer's own outline, or — where the scan reported no
              planes at all — the envelope, faint and white so it cannot pass
              for a tracing of the roof. */}
          {roofPath.length >= 3 && !(detectedOnly && planes.length > 0) && (
            <Polygon
              paths={roofPath}
              geodesic
              clickable={false}
              fillColor={detectedOnly ? DETECTED : BRAND}
              fillOpacity={detectedOnly ? 0.06 : 0.22}
              strokeColor={detectedOnly ? DETECTED : BRAND}
              strokeOpacity={detectedOnly ? 0.75 : 1}
              strokeWeight={detectedOnly ? 1.5 : 3}
            />
          )}

          {affectedPath.length >= 3 && (
            <Polygon
              paths={affectedPath}
              geodesic
              clickable={false}
              fillColor={AFFECTED}
              fillOpacity={0.28}
              strokeColor={AFFECTED}
              strokeOpacity={1}
              strokeWeight={3}
            />
          )}
        </Map>
      </APIProvider>

      {/* Name what is drawn, so neither shape has to be guessed at. */}
      {detectedOnly && planes.length > 0 && (
        <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {planes.length} roof {planes.length === 1 ? "plane" : "planes"} from
          the satellite scan
        </span>
      )}
      {detectedOnly && planes.length === 0 && roofPath.length >= 3 && (
        <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          Whole building measured · not a traced outline
        </span>
      )}

      {roofPath.length < 3 && affectedPath.length < 3 && planes.length === 0 && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          No roof outline was drawn
        </span>
      )}
      {affectedPath.length >= 3 && roofPath.length < 3 && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          Affected area
        </span>
      )}
    </div>
  );
}
