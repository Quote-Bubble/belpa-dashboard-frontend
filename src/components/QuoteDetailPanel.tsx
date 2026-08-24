"use client";

import {
  Archive,
  Check,
  Clock,
  Copy,
  House,
  Layers,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import type { DashboardLead, LeadPayload, LeadStatus } from "@/lib/types";
import {
  EMPTY,
  conditionLabel,
  displayPostcode,
  formatArea,
  formatCount,
  formatDateOnly,
  formatDateTime,
  formatLength,
  formatMoney,
  formatPitch,
  formatQuoteRange,
  formatRelativeTime,
  intentLabel,
  isSafeMailtoHref,
  isSafeTelHref,
  jobTypeLabel,
  materialLabel,
  payloadLabel,
  propertyTypeLabel,
  rooflineScopeLabel,
  roofTypeLabel,
  statusColor,
  statusLabel,
  storeysLabel,
  whatsappLink,
} from "@/lib/format";
import MediaStrip from "@/components/MediaStrip";
import RoofMap from "@/components/RoofMap";
import MediaViewer, { type MediaItem } from "@/components/MediaViewer";
import StreetView from "@/components/StreetView";
import StatusPicker from "@/components/StatusPicker";
import { useSignedPhotos } from "@/lib/use-signed-photos";

// 18px in the fact rows and contact list, to sit level with 15px text rather
// than looking undersized beside it.
const Icons = {
  phone: <Phone size={18} strokeWidth={2} />,
  mail: <Mail size={18} strokeWidth={2} />,
  pin: <MapPin size={18} strokeWidth={2} />,
  clock: <Clock size={18} strokeWidth={2} />,
  alert: <TriangleAlert size={18} strokeWidth={2} />,
  home: <House size={18} strokeWidth={2} />,
  layers: <Layers size={18} strokeWidth={2} />,
  copy: <Copy size={13} strokeWidth={2.25} />,
  check: <Check size={13} strokeWidth={2.25} />,
  archive: <Archive size={16} strokeWidth={2} />,
  restore: <RotateCcw size={16} strokeWidth={2} />,
};

/**
 * Compact label-over-value cell, used only inside the full-survey disclosure.
 *
 * Nothing renders one of these with a missing value any more: the panel filters
 * empties out before building the list. A repair lead was showing nine dashes
 * out of thirteen fields, so most of the panel was spent saying what it did not
 * know. The guard stays because a dash is still better than a blank if one ever
 * slips through.
 */
function Figure({ label, value }: { label: string; value: string }) {
  const missing = value === EMPTY;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={[
          "mt-0.5 text-sm font-semibold",
          missing ? "text-muted opacity-60" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

/** A row in the at-a-glance list: icon, then the fact itself. No label — the
 *  icon carries it, and "Semi-detached" needs no caption saying "Property". */
function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="mt-px shrink-0 text-muted">{icon}</span>
      <span className="min-w-0 text-[15px] font-medium leading-6 text-ink">
        {children}
      </span>
    </li>
  );
}

/** Drops empty values so a section with nothing in it disappears entirely. */
function present(pairs: [string, string][]): [string, string][] {
  return pairs.filter(([, value]) => value && value !== EMPTY);
}

/** Names a group of images, so a map and a broken tile are visibly not the
 *  same kind of thing. */
function GroupLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted ${className}`}
    >
      {children}
    </p>
  );
}

function Skeleton() {
  return <div className="h-full animate-pulse rounded-xl bg-black/[0.04]" />;
}

/** The lead id, kept available for support without letting a UUID lead the page. */
function QuoteIdCopy({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context / denied permission) — the id is
      // still selectable on screen, so there's nothing useful to report.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={id}
      aria-label={`Copy quote reference ${id}`}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[11px] text-muted transition-colors hover:bg-black/[0.04] hover:text-ink-soft"
    >
      <span className="shrink-0">{copied ? Icons.check : Icons.copy}</span>
      <span className="truncate">
        {copied ? "Reference copied" : `#${id.slice(0, 8).toUpperCase()}`}
      </span>
    </button>
  );
}

export default function QuoteDetailPanel({
  lead,
  payload,
  loading,
  error,
  onStatusChange,
  onArchive,
  archivedView,
}: {
  lead: DashboardLead;
  payload: LeadPayload | null;
  loading: boolean;
  error: string | null;
  /** Omitted on the Jobs view, which has no status model to write back to —
   *  the status then renders as a plain badge rather than a dead dropdown. */
  onStatusChange?: (id: string, status: LeadStatus) => void;
  onArchive: (id: string) => void;
  archivedView: boolean;
}) {
  const solar = payload?.solar ?? null;
  const roofline = payload?.roofline ?? null;
  const obstructions = payload?.obstructions ?? null;
  const damage = payload?.damage ?? null;
  const photoPaths = (damage?.photoPaths ?? []).filter(
    (p): p is string => typeof p === "string",
  );

  const postcode = displayPostcode(lead.addressFormatted, lead.addressPostcode);
  const canText = lead.contactPhone.trim() && isSafeTelHref(lead.contactPhone);

  const photos = useSignedPhotos(photoPaths);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  /* Layout keys off the stored paths rather than the signed URLs, which arrive
     a moment later — otherwise the tiles would lay out one way, then jump when
     the signing resolved. */
  const hasPhotos = photoPaths.length > 0;

  /* Viewer contents: the customer's photos, in order. The aerial is not in
     here — it is a live map that pans and zooms in the panel, so a lightbox
     would be a worse version of what is already on screen. */
  const viewerItems: MediaItem[] =
    photos.state === "ready"
      ? photos.urls.map((url, i) => ({
          label: `Customer photo ${i + 1} of ${photos.urls.length}`,
          url,
        }))
      : [];

  /* At-a-glance rows: only what this lead actually knows. Property type and
     storeys read as one fact, the way someone would say it out loud.
     storeysLabel returns the bare count ("Two") because it used to sit under a
     "Storeys" caption; without that caption "Semi-detached, Two" reads as a
     truncation, so the noun goes back in here. */
  const storeys = storeysLabel(payload?.storeys);
  const storeysLine =
    storeys === EMPTY
      ? EMPTY
      : `${storeys.toLowerCase()} store${payload?.storeys === 1 ? "y" : "ys"}`;
  const propertyLine = [propertyTypeLabel(payload?.propertyType), storeysLine]
    .filter((v) => v && v !== EMPTY)
    .join(" · ");

  // The long tail, shown only on jobs that measured something.
  const survey = [
    ...present([
      ["Area", formatArea(solar?.areaM2)],
      ["Ground area", formatArea(solar?.groundAreaM2)],
      ["Pitch", formatPitch(solar?.pitchDegrees)],
      ["Roof type", roofTypeLabel(solar?.roofType)],
      ["Gutter run", formatLength(roofline?.gutterLengthM)],
      ["Perimeter", formatLength(roofline?.perimeterM)],
      ["Scope", rooflineScopeLabel(roofline?.scope)],
      ["Chimneys", formatCount(obstructions?.chimneys)],
      ["Rooflights", formatCount(obstructions?.rooflights)],
      ["Condition", conditionLabel(payload?.conditionAnswer)],
    ]),
  ];

  return (
    <div className="px-4 pb-4 pt-1 sm:px-6">
      {/* Wide, but still a card.
          Three attempts to size this: full-bleed stretched it to 1200px of
          run-on sentences, max-w-4xl left dead gutters either side, and a
          third column filled those gutters by squeezing every column until
          nothing had room. The width is not the problem to solve — the
          proportions are. Two columns, generous, capped where a line of text
          stops being comfortable to read rather than where the screen ends. */}
      <div className="surface mx-auto max-w-7xl overflow-hidden rounded-2xl p-5 sm:p-7">
        {/* An even split, and two labelled groups inside it.
            Before this the three images were three sizes with no logic: a huge
            frontage, then a small aerial and a small damage photo side by side
            as though a map and a broken tile answered the same question. They
            answer different ones, so they are grouped and named, and nothing is
            arbitrarily larger than anything else. */}
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
          {/* ---------------- Evidence ---------------- */}
          <div className="min-w-0">
            <GroupLabel>The property</GroupLabel>
            {/* Side by side when photos follow, stacked and wide when they do
                not.
                A full replacement carries no damage photos, so the two tiles
                were the entire column — half the card wide, a fifth of it
                tall, with the detail column running on for another 400px
                beside them. Stacking uses that height instead of leaving a
                hole in it, and the frontage is worth seeing large anyway. */}
            <div
              className={
                hasPhotos ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"
              }
            >
              <div
                className={`overflow-hidden ${hasPhotos ? "aspect-[4/3]" : "aspect-[16/9]"}`}
              >
                {loading ? (
                  <Skeleton />
                ) : (
                  <StreetView
                    payload={payload}
                    address={lead.addressFormatted}
                  />
                )}
              </div>
              <div
                className={`overflow-hidden ${hasPhotos ? "aspect-[4/3]" : "aspect-[16/9]"}`}
              >
                {loading ? <Skeleton /> : <RoofMap payload={payload} />}
              </div>
            </div>

            {/* Photos get their own named row rather than sharing a strip with
                the maps. The count is in the label so the roofer knows there
                are more before clicking anything. */}
            {loading ? (
              <>
                <GroupLabel className="mt-5">Customer photos</GroupLabel>
                {/* Mirrors MediaStrip's shape for this count, so the row does
                    not change size the moment the URLs resolve. */}
                <div
                  className={`grid gap-3 ${photoPaths.length === 1 ? "grid-cols-1" : photoPaths.length === 2 ? "grid-cols-2" : photoPaths.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}
                >
                  {Array.from({ length: Math.min(photoPaths.length, 4) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={`animate-pulse rounded-xl bg-black/[0.04] ${photoPaths.length === 1 ? "aspect-[16/10]" : photoPaths.length <= 3 ? "aspect-[4/3]" : "aspect-square"}`}
                      />
                    ),
                  )}
                </div>
              </>
            ) : photos.state === "ready" && photos.urls.length > 0 ? (
              <>
                <GroupLabel className="mt-5">
                  Customer photos · {photos.urls.length}
                </GroupLabel>
                <MediaStrip urls={photos.urls} onOpen={setViewerIndex} />
              </>
            ) : photos.state === "failed" ? (
              <>
                <GroupLabel className="mt-5">Customer photos</GroupLabel>
                <p className="text-sm text-muted">
                  Couldn&apos;t load them just now.
                </p>
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col">
            {/* ---------------- The facts ---------------- */}
            <div className="min-w-0">
              <p className="font-display text-4xl font-semibold tracking-tight text-ink">
                {formatQuoteRange(lead.quoteMinExVat, lead.quoteMaxExVat)}
              </p>
              <p className="mt-1 text-[15px] text-muted">
                ex. VAT
                {lead.actualPriceExVat != null && (
                  <span className="ml-2 font-semibold text-ink">
                    · won at {formatMoney(lead.actualPriceExVat)}
                  </span>
                )}
              </p>
              <p className="mt-2 text-base font-medium text-ink-soft">
                {jobTypeLabel(lead.jobType)}
                {lead.leadType === "manual_consultation" &&
                  " · consultation request"}
                {/* Intent, only when it is not the ordinary one.
                    Its chip is gone because "Quote requested" described nearly
                    every lead and said nothing. The other two are not noise:
                    "priced only" means they never asked to be contacted, and
                    "callback requested" means they are waiting for the phone
                    to ring. Those ride on this line rather than as a pill. */}
                {lead.intent !== "quote_requested" &&
                  ` · ${intentLabel(lead.intent).toLowerCase()}`}
              </p>

              {payload?.otherJobDescription && (
                <p className="mt-2.5 rounded-lg bg-black/[0.03] px-3 py-2 text-sm text-ink-soft">
                  “{payload.otherJobDescription}”
                </p>
              )}
              {payload?.fallbackReason && (
                <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span className="mt-0.5 shrink-0">{Icons.alert}</span>
                  <span>
                    No instant quote — {payloadLabel(payload.fallbackReason)}
                  </span>
                </p>
              )}

              {/* Status alone.
                  The intent tag restated what the panel already is, and the
                  severity pill said the same thing as the meter a few rows
                  below it. Three pills in a row for one piece of information
                  read as clutter, so only the one you can actually change
                  stays. */}
              <div className="mt-4">
                {onStatusChange ? (
                  <StatusPicker
                    status={lead.status}
                    onChange={(next) => onStatusChange(lead.id, next)}
                  />
                ) : (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      color: statusColor(lead.status).fg,
                      backgroundColor: statusColor(lead.status).bg,
                    }}
                  >
                    {statusLabel(lead.status)}
                  </span>
                )}
              </div>

              {payload?.conditionFlagged && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span className="mt-0.5 shrink-0">{Icons.alert}</span>
                  <span>
                    Customer flagged the roof’s condition — worth asking about
                    before you price the job.
                  </span>
                </p>
              )}

              {/* ---- what this lead actually knows ---- */}
              <ul className="mt-5 space-y-3.5 border-t border-line pt-5">
                {propertyLine && <Row icon={Icons.home}>{propertyLine}</Row>}
                {materialLabel(payload?.material) !== EMPTY && (
                  <Row icon={Icons.layers}>
                    {materialLabel(payload?.material)}
                  </Row>
                )}
                {(lead.addressFormatted || postcode) && (
                  <Row icon={Icons.pin}>
                    {lead.addressFormatted}
                    {postcode && (
                      <span className="text-ink-soft">
                        {lead.addressFormatted ? ", " : ""}
                        {postcode}
                      </span>
                    )}
                  </Row>
                )}
                {/* No severity row.
                    The grade is still computed and still narrows the customer's
                    estimate, but it is not shown to the roofer: the model reads
                    the same photograph they are looking at, from no better
                    vantage point, so putting a number on it only anchors a
                    judgement that is theirs to make. */}
                <Row icon={Icons.clock}>
                  <span title={formatDateTime(lead.receivedAt)}>
                    {formatRelativeTime(lead.receivedAt)}
                  </span>
                </Row>
              </ul>
            </div>

            {/* ---------------- What you do about it ---------------- */}
            {/* No top rule at xl: the column gap already separates it, and a
                second horizontal line there just adds clutter. */}
            <div className="mt-5 min-w-0 border-t border-line pt-5">
              {canText && (
                <a
                  href={whatsappLink(lead.contactPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#25D366] bg-white px-4 py-3 text-[15px] font-semibold text-[#128a3f] shadow-[0_6px_16px_-8px_rgba(37,211,102,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#25D366]/10"
                >
                  <svg
                    width={17}
                    height={17}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.41 9.43-9.41 2.52 0 4.88.98 6.66 2.76a9.35 9.35 0 0 1 2.76 6.66c-.01 5.19-4.24 9.41-9.4 9.41zm8.02-17.43A11.28 11.28 0 0 0 12.04.75C5.8.75.72 5.83.72 12.07c0 1.99.52 3.94 1.51 5.66L.63 23.5l5.9-1.55a11.3 11.3 0 0 0 5.5 1.4h.01c6.24 0 11.32-5.08 11.32-11.32 0-3.03-1.18-5.87-3.3-8z" />
                  </svg>
                  WhatsApp {lead.contactName.split(" ")[0]}
                </a>
              )}
              <div className={canText ? "mt-4 space-y-3" : "space-y-3"}>
                {lead.contactPhone.trim() ? (
                  isSafeTelHref(lead.contactPhone) ? (
                    <a
                      href={`tel:${lead.contactPhone.trim()}`}
                      className="flex items-center gap-3.5 text-[15px] font-medium text-brand-600"
                    >
                      <span className="text-muted">{Icons.phone}</span>
                      {lead.contactPhone}
                    </a>
                  ) : (
                    <span className="flex items-center gap-3.5 text-[15px] font-medium text-ink">
                      <span className="text-muted">{Icons.phone}</span>
                      {lead.contactPhone}
                    </span>
                  )
                ) : null}
                {lead.contactEmail &&
                  (isSafeMailtoHref(lead.contactEmail) ? (
                    <a
                      href={`mailto:${lead.contactEmail.trim()}`}
                      className="flex items-center gap-3.5 truncate text-[15px] font-medium text-brand-600"
                    >
                      <span className="shrink-0 text-muted">{Icons.mail}</span>
                      <span className="truncate">{lead.contactEmail}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-3.5 truncate text-[15px] font-medium text-ink">
                      <span className="shrink-0 text-muted">{Icons.mail}</span>
                      <span className="truncate">{lead.contactEmail}</span>
                    </span>
                  ))}
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-700">
                  Couldn’t load the full detail for this lead: {error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* The long tail of survey figures.
            Full width below the columns, so its grid has room once opened.
            Collapsed, and not rendered at all when the job measured nothing —
            which is every repair. This is what used to fill the panel with
            dashes. */}
        {!loading && survey.length > 0 && (
          <details className="group mt-6 border-t border-line pt-4">
            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink-soft">
              <span className="inline-block transition-transform group-open:rotate-90">
                ▸
              </span>{" "}
              Full survey ({survey.length})
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4 xl:grid-cols-6">
              {survey.map(([label, value]) => (
                <Figure key={label} label={label} value={value} />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-muted">
              Measured by {payloadLabel(solar?.measurementMethod)} · imagery{" "}
              {payloadLabel(solar?.imageryQuality).toLowerCase()}
              {solar?.imageryDate
                ? `, captured ${formatDateOnly(solar.imageryDate)}`
                : ""}
              . Gutter and obstruction figures are totals — the widget does not
              store where the customer marked them.
            </p>
          </details>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <QuoteIdCopy id={lead.id} />
          <button
            type="button"
            onClick={() => onArchive(lead.id)}
            className="btn-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft"
          >
            {archivedView ? Icons.restore : Icons.archive}
            {archivedView ? "Restore" : "Archive"}
          </button>
        </div>
      </div>

      {viewerIndex !== null && (
        <MediaViewer
          items={viewerItems}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
