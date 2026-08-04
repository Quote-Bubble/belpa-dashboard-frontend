/**
 * Snippet builders for the admin console — the exact code/links an operator
 * hands a roofer. All point at the widget origin (where launch.js, widget.js,
 * /l and /w are served from).
 *
 * Set NEXT_PUBLIC_WIDGET_ORIGIN to the product domain once DNS is live
 * (e.g. https://quote.getquoter.io). Until then snippets use the Vercel URL.
 * Prefer /v1/* loader paths so a future breaking change can ship as /v2.
 */

/** Origin the widget product is served from. */
export const WIDGET_ORIGIN =
  process.env.NEXT_PUBLIC_WIDGET_ORIGIN?.replace(/\/+$/, "") ||
  "https://widget.belpa.co.uk";

/** Versioned loader root — bump when the embed contract breaks. */
const LOADER_ROOT = `${WIDGET_ORIGIN}/v1`;

/** The roofer's shareable link — works with no website (WhatsApp, GBP, QR). */
export function hostedLink(slug: string): string {
  return `${WIDGET_ORIGIN}/l/${slug}`;
}

/** Preview the button flow on a mock roofer site (Summit & Slate). */
export function previewButton(slug: string): string {
  return `${WIDGET_ORIGIN}/demo-button.html?roofer=${encodeURIComponent(slug)}`;
}

/** Preview the inline widget on a different mock roofer site (Kingfisher). */
export function previewWidget(slug: string): string {
  return `${WIDGET_ORIGIN}/demo-widget.html?roofer=${encodeURIComponent(slug)}`;
}

/** Fullscreen button flow: a button + the launch loader. */
export function buttonSnippet(slug: string): string {
  return `<button data-quoter-launch data-roofer="${slug}">Get a free quote</button>
<script src="${LOADER_ROOT}/launch.js" async></script>`;
}

/** Inline widget flow: drop the expanded flow straight into the page. */
export function widgetSnippet(slug: string): string {
  return `<script
  src="${LOADER_ROOT}/widget.js"
  data-roofer="${slug}"
  async></script>`;
}
