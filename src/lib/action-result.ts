/** Shared shape for server actions that surface success/error to the UI. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export function ok(message?: string): ActionResult {
  return message ? { ok: true, message } : { ok: true };
}

export function fail(error: string): ActionResult {
  return { ok: false, error };
}
