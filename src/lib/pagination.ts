/**
 * Pagination constants shared by the server Quotes page and the client
 * QuotesTable.
 *
 * IMPORTANT: this MUST live in a plain (non-"use client") module. The server
 * component `quotes/page.tsx` reads `PAGE_SIZE_OPTIONS` to validate the page
 * size. When a server component imports a *value* from a "use client" file,
 * Next replaces it with a client-reference stub — not the real array — so
 * `PAGE_SIZE_OPTIONS.includes(...)` throws "is not a function" and crashes the
 * whole page. Keeping it here means both sides get the genuine array.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const DEFAULT_PAGE_SIZE = 25;
