/**
 * Snippet builders for the admin console — the exact code/links an operator
 * hands a roofer. All point at the widget origin (where launch.js, widget.js,
 * /l and /w are served from).
 */

/** Origin the widget product is served from. */
export const WIDGET_ORIGIN =
  process.env.NEXT_PUBLIC_WIDGET_ORIGIN?.replace(/\/+$/, "") ||
  "https://quoter-widget-frontend.vercel.app";

/** The roofer's shareable link — works with no website (WhatsApp, GBP, QR). */
export function hostedLink(slug: string): string {
  return `${WIDGET_ORIGIN}/l/${slug}`;
}

/** Fullscreen button flow: a button + the launch loader. */
export function buttonSnippet(slug: string): string {
  return `<button data-quoter-launch data-roofer="${slug}">Get a free quote</button>
<script src="${WIDGET_ORIGIN}/launch.js" async></script>`;
}

/** Inline widget flow: drop the expanded flow straight into the page. */
export function widgetSnippet(slug: string): string {
  return `<script
  src="${WIDGET_ORIGIN}/widget.js"
  data-roofer="${slug}"
  async></script>`;
}
