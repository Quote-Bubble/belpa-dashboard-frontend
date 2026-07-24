import type { LatLng } from "@/lib/types";

const VIEW = 100;
const PAD = 10;
const METRES_PER_DEG_LAT = 111_320;
const MAX_COORDS = 512;

export type Projected = { points: string; widthM: number | null };

function isFiniteLatLng(c: unknown): c is LatLng {
  if (!c || typeof c !== "object") return false;
  const { lat, lng } = c as LatLng;
  return (
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  );
}

/** Sanitize untrusted jsonb polygonCoords before projection. */
export function sanitizePolygonCoords(raw: unknown): LatLng[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_COORDS).filter(isFiniteLatLng);
}

/** Equirectangular projection, good enough at building scale. Longitude is
 *  scaled by cos(lat) so the shape keeps its real proportions, then the whole
 *  outline is fitted into the viewBox. North stays up. */
export function project(coords: unknown): Projected | null {
  const pts = sanitizePolygonCoords(coords);
  if (pts.length < 3) return null;

  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const kx = Math.cos((lat0 * Math.PI) / 180);

  const xs = pts.map((p) => p.lng * kx);
  const ys = pts.map((p) => -p.lat);

  // reduce avoids Math.min(...xs) RangeError on large arrays
  const minX = xs.reduce((m, x) => (x < m ? x : m));
  const maxX = xs.reduce((m, x) => (x > m ? x : m));
  const minY = ys.reduce((m, y) => (y < m ? y : m));
  const maxY = ys.reduce((m, y) => (y > m ? y : m));

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const span = Math.max(spanX, spanY);
  if (!(span > 0)) return null;

  const scale = (VIEW - PAD * 2) / span;
  const offsetX = PAD + (VIEW - PAD * 2 - spanX * scale) / 2;
  const offsetY = PAD + (VIEW - PAD * 2 - spanY * scale) / 2;

  const points = pts
    .map((_, i) => {
      const x = (xs[i] - minX) * scale + offsetX;
      const y = (ys[i] - minY) * scale + offsetY;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const widthM = spanX * METRES_PER_DEG_LAT;
  return { points, widthM: widthM > 0 ? widthM : null };
}
