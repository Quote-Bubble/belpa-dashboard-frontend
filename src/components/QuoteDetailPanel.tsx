"use client";

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
  intentTone,
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
import RoofPlan from "@/components/RoofPlan";
import StatusPicker from "@/components/StatusPicker";

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icons = {
  phone: (
    <svg {...iconProps}>
      <path d="M4 5c0 8.3 6.7 15 15 15v-3.5l-4-1.5-2 2a12 12 0 0 1-6-6l2-2L11 5H4z" />
    </svg>
  ),
  mail: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  ),
  pin: (
    <svg {...iconProps}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  clock: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 1.9" />
    </svg>
  ),
  alert: (
    <svg {...iconProps}>
      <path d="M12 4l9 16H3l9-16zM12 10v4M12 17h.01" />
    </svg>
  ),
  copy: (
    <svg {...iconProps} width={13} height={13}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h9" />
    </svg>
  ),
  check: (
    <svg {...iconProps} width={13} height={13}>
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  ),
  archive: (
    <svg {...iconProps} width={15} height={15}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  ),
  restore: (
    <svg {...iconProps} width={15} height={15}>
      <path d="M4 9a8 8 0 1 1 .9 5.3" />
      <path d="M4 4v5h5" />
    </svg>
  ),
};

function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </p>
  );
}

/** Compact label-over-value cell. Missing values stay legible but recede, so a
 *  dash never carries the same weight as a real measurement. */
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

/** One titled group of survey figures. */
function Cluster({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <ColLabel>{label}</ColLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
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

  const postcode = displayPostcode(lead.addressFormatted, lead.addressPostcode);
  const tone = intentTone(lead.intent);
  const canText = lead.contactPhone.trim() && isSafeTelHref(lead.contactPhone);

  return (
    <div className="px-4 pb-4 pt-1 sm:px-6">
      <div className="surface overflow-hidden rounded-2xl p-6 sm:p-7">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,19rem)_1fr] lg:gap-9">
          {/* ---------------- Action rail: everything you act on ------------- */}
          <div className="flex min-w-0 flex-col lg:border-r lg:border-line lg:pr-8">
            <p className="font-display text-3xl font-semibold text-ink">
              {formatQuoteRange(lead.quoteMinExVat, lead.quoteMaxExVat)}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              ex. VAT
              {lead.actualPriceExVat != null && (
                <span className="ml-2 font-semibold text-ink">
                  · won at {formatMoney(lead.actualPriceExVat)}
                </span>
              )}
            </p>
            <p className="mt-2 text-sm font-medium text-ink-soft">
              {jobTypeLabel(lead.jobType)}
              {lead.leadType === "manual_consultation" &&
                " · consultation request"}
            </p>

            {payload?.otherJobDescription && (
              <p className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2 text-sm text-ink-soft">
                “{payload.otherJobDescription}”
              </p>
            )}
            {payload?.fallbackReason && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span className="mt-0.5 shrink-0">{Icons.alert}</span>
                <span>
                  No instant quote — {payloadLabel(payload.fallbackReason)}
                </span>
              </p>
            )}

            {/* Status is the control; intent is a fact about the lead, so it
                reads as a quiet outlined tag rather than a second pill. */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
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
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  color: tone.fg,
                  background: tone.bg,
                  borderColor: `${tone.fg}33`,
                }}
              >
                {intentLabel(lead.intent)}
              </span>
            </div>

            <p
              className="mt-3 flex items-center gap-2 text-sm text-ink-soft"
              title={formatDateTime(lead.receivedAt)}
            >
              <span className="text-muted">{Icons.clock}</span>
              {formatRelativeTime(lead.receivedAt)}
            </p>

            {/* ---- contact ---- */}
            <div className="mt-6 border-t border-line pt-5">
              <ColLabel>Contact</ColLabel>
              {canText && (
                <a
                  href={whatsappLink(lead.contactPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#25D366] bg-white px-4 py-2.5 text-sm font-semibold text-[#128a3f] shadow-[0_6px_16px_-8px_rgba(37,211,102,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#25D366]/10"
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
                      className="flex items-center gap-2.5 text-sm font-medium text-brand-600"
                    >
                      <span className="text-muted">{Icons.phone}</span>
                      {lead.contactPhone}
                    </a>
                  ) : (
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <span className="text-muted">{Icons.phone}</span>
                      {lead.contactPhone}
                    </span>
                  )
                ) : null}
                {lead.contactEmail &&
                  (isSafeMailtoHref(lead.contactEmail) ? (
                    <a
                      href={`mailto:${lead.contactEmail.trim()}`}
                      className="flex items-center gap-2.5 truncate text-sm font-medium text-brand-600"
                    >
                      <span className="shrink-0 text-muted">{Icons.mail}</span>
                      <span className="truncate">{lead.contactEmail}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-2.5 truncate text-sm font-medium text-ink">
                      <span className="shrink-0 text-muted">{Icons.mail}</span>
                      <span className="truncate">{lead.contactEmail}</span>
                    </span>
                  ))}
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-muted">{Icons.pin}</span>
                  <span className="text-sm font-medium text-ink">
                    {lead.addressFormatted || EMPTY}
                    {postcode && (
                      <span className="block text-ink-soft">{postcode}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Anchored to the foot of the rail so the reference and archive
                sit on the panel's baseline instead of leaving a hole beneath
                a rail that is shorter than the evidence column. */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 lg:mt-auto lg:pt-5">
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

          {/* ---------------- Evidence: everything you verify ---------------- */}
          <div className="min-w-0">
            <div className="h-56 sm:h-64">
              {loading ? (
                <div className="h-full animate-pulse rounded-xl bg-black/[0.04]" />
              ) : (
                <RoofPlan payload={payload} />
              )}
            </div>

            {payload?.conditionFlagged && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span className="mt-0.5 shrink-0">{Icons.alert}</span>
                <span>
                  Customer flagged the roof’s condition — worth asking about
                  before you price the job.
                </span>
              </p>
            )}

            {error ? (
              <p className="mt-6 text-sm text-red-700">
                Couldn’t load the full detail for this lead: {error}
              </p>
            ) : loading ? (
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2.5 w-16 animate-pulse rounded bg-black/[0.06]" />
                    <div className="h-3.5 w-12 animate-pulse rounded bg-black/[0.06]" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  <Cluster label="Roof">
                    <Figure label="Area" value={formatArea(solar?.areaM2)} />
                    <Figure
                      label="Ground area"
                      value={formatArea(solar?.groundAreaM2)}
                    />
                    <Figure
                      label="Pitch"
                      value={formatPitch(solar?.pitchDegrees)}
                    />
                    <Figure
                      label="Type"
                      value={roofTypeLabel(solar?.roofType)}
                    />
                  </Cluster>

                  <Cluster label="Roofline">
                    <Figure
                      label="Gutter run"
                      value={formatLength(roofline?.gutterLengthM)}
                    />
                    <Figure
                      label="Perimeter"
                      value={formatLength(roofline?.perimeterM)}
                    />
                    <Figure
                      label="Scope"
                      value={rooflineScopeLabel(roofline?.scope)}
                    />
                  </Cluster>

                  <Cluster label="Property">
                    <Figure
                      label="Type"
                      value={propertyTypeLabel(payload?.propertyType)}
                    />
                    <Figure
                      label="Storeys"
                      value={storeysLabel(payload?.storeys)}
                    />
                    <Figure
                      label="Material"
                      value={materialLabel(payload?.material)}
                    />
                    <Figure
                      label="Condition"
                      value={conditionLabel(payload?.conditionAnswer)}
                    />
                  </Cluster>

                  <Cluster label="Obstructions">
                    <Figure
                      label="Chimneys"
                      value={formatCount(obstructions?.chimneys)}
                    />
                    <Figure
                      label="Rooflights"
                      value={formatCount(obstructions?.rooflights)}
                    />
                  </Cluster>
                </div>

                <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
                  Measured by {payloadLabel(solar?.measurementMethod)} · imagery{" "}
                  {payloadLabel(solar?.imageryQuality).toLowerCase()}
                  {solar?.imageryDate
                    ? `, captured ${formatDateOnly(solar.imageryDate)}`
                    : ""}
                  . Gutter and obstruction figures are totals — the widget does
                  not store where the customer marked them.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
