/**
 * Aiming Street View at the right house.
 *
 * Requesting by `location=lat,lng` does two things people do not expect. It
 * snaps to the nearest panorama, which is out in the road, and then it uses
 * that panorama's DEFAULT heading — whichever way the camera van happened to be
 * pointing. The result is a picture of the street, a neighbour, or a hedge, and
 * only coincidentally the property being quoted.
 *
 * The metadata response contains the panorama's own coordinates, so the fix is
 * arithmetic: work out the bearing from camera to house and send it. Measured
 * on a real lead, the camera sat 25m away and needed 263°; we were sending
 * nothing.
 *
 * Requesting by `pano` rather than `location` then pins that exact panorama, so
 * the image cannot re-snap to a different one later. Google's terms name
 * pano_id as explicitly cacheable, unlike the imagery itself.
 */

export type LatLng = { lat: number; lng: number };

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Compass bearing from `from` to `to`, in degrees clockwise from north. */
export function bearing(from: LatLng, to: LatLng): number {
  const p1 = rad(from.lat);
  const p2 = rad(to.lat);
  const dl = rad(to.lng - from.lng);
  const y = Math.sin(dl) * Math.cos(p2);
  const x =
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const p1 = rad(a.lat);
  const p2 = rad(b.lat);
  const dp = p2 - p1;
  const dl = rad(b.lng - a.lng);
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Beyond this, the nearest panorama is too far away to be showing the property.
 *
 * A UK street is ~10-30m from kerb to frontage, so 25m is normal and 60m means
 * the camera never came down this road — a private drive, a new estate, a rear
 * access lane. Better to say "we cannot show this one" than to display a
 * confident photograph of somewhere else, which is the current failure and the
 * one a roofer would act on.
 */
export const MAX_CAMERA_DISTANCE_M = 60;

/**
 * Field of view, degrees. Narrower than the 80 used before: once the camera is
 * actually AIMED at the house, a tighter frame fills more of the picture with
 * the property instead of its neighbours.
 */
const FOV = 70;

export function streetViewUrl(opts: {
  panoId: string;
  house: LatLng;
  camera: LatLng;
  key: string;
  size?: string;
}): string {
  const params = new URLSearchParams({
    size: opts.size ?? "640x400",
    // Exact panorama, so it can never re-snap to a different one.
    pano: opts.panoId,
    heading: bearing(opts.camera, opts.house).toFixed(1),
    fov: String(FOV),
    // Slight upward tilt: roofs are the subject, and a level camera at 25m
    // gives a lot of driveway.
    pitch: "10",
    return_error_code: "true",
    key: opts.key,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params}`;
}
