import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error reporting. Covers server components, route handlers and server actions.
 *
 * No SENTRY_DSN → init is skipped and every Sentry.* call becomes a no-op, so
 * local dev and tests stay silent without branching at the call sites.
 *
 * On placement: this sits in src/ alongside the app, but the repo root works
 * too — Next resolves instrumentation from either. The commit that moved these
 * files here claimed root placement was breaking the build. It was not. The
 * real fault was in the verification script, which appended chunk paths to the
 * full page URL instead of the origin, so every fetch it made returned a
 * redirect rather than JavaScript. Kept here because it is the conventional
 * spot for a src/ project, not because root was wrong.
 */
export function register(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
