import type { NextConfig } from "next";

/**
 * Security headers + client Router Cache window.
 *
 * `staleTimes` is still experimental in Next 16.2 — keep it under
 * `experimental` or the caching rationale in `actions.ts` is silently ignored.
 */
const nextConfig: NextConfig = {
  experimental: {
    // Next's client-side Router Cache stores visited pages in memory, but
    // dynamic routes default to a 0s freshness window — every click refetches
    // from the server even when nothing changed. These pages don't change
    // that often, so let revisits within the window reuse the cached copy.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  async headers() {
    /* The Google Maps entries exist for the roof map on the lead detail panel
       (RoofMap.tsx). Maps JS loads its own further scripts from gstatic,
       fetches tiles and metadata over XHR, pulls Roboto from fonts.gstatic,
       and spawns blob: workers for vector rendering — leave any one out and
       the map fails closed against this CSP rather than rendering. */
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://maps.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
