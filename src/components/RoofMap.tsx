"use client";

import { useState } from "react";
import { APIProvider, Map, Polygon } from "@vis.gl/react-google-maps";

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

  const path = sanitizePolygonCoords(payload?.polygonCoords);
  const view = payload?.mapView ?? null;
  const center = view?.center ?? coords;
  const zoom = view?.zoom ?? FALLBACK_ZOOM;

  return (
    <div className="relative h-full min-h-[220px] overflow-hidden rounded-xl border border-line bg-[#0f1520]">
      <APIProvider apiKey={apiKey} onError={() => setMapsUnavailable(true)}>
        <Map
          mapTypeId="satellite"
          defaultCenter={center}
          defaultZoom={zoom}
          // The roofer is inspecting, not editing: panning and zooming are the
          // point, but rotation/tilt would only let them lose the building.
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          rotateControl={false}
          tiltInteractionEnabled={false}
          isFractionalZoomEnabled
          reuseMaps
          style={{ width: "100%", height: "100%" }}
        >
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

      {path.length < 3 && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          No roof outline was drawn
        </span>
      )}
    </div>
  );
}
