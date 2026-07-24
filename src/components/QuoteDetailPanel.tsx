"use client";

import type { DashboardLead, LeadPayload } from "@/lib/types";
import {
  EMPTY,
  conditionLabel,
  formatArea,
  formatCount,
  formatDateOnly,
  formatDateTime,
  formatLength,
  formatPitch,
  formatQuoteRange,
  isSafeMailtoHref,
  isSafeTelHref,
  jobTypeLabel,
  materialLabel,
  payloadLabel,
  rooflineScopeLabel,
  roofTypeLabel,
  whatsappLink,
} from "@/lib/format";
import RoofPlan from "@/components/RoofPlan";

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
  postcode: (
    <svg {...iconProps}>
      <path d="M7 3v18M17 3v18M7 8h10M7 16h10" />
    </svg>
  ),
  calendar: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  layers: (
    <svg {...iconProps}>
      <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />
    </svg>
  ),
  alert: (
    <svg {...iconProps}>
      <path d="M12 4l9 16H3l9-16zM12 10v4M12 17h.01" />
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

/** Row with a leading icon, a label, and a right-aligned value. */
function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2.5 text-sm text-ink-soft">
        <span className="text-muted">{icon}</span>
        {label}
      </span>
      <span className="text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

/** Compact label-over-value cell for the survey grid. */
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
          missing ? "text-muted" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export default function QuoteDetailPanel({
  lead,
  payload,
  loading,
  error,
}: {
  lead: DashboardLead;
  payload: LeadPayload | null;
  loading: boolean;
  error: string | null;
}) {
  const solar = payload?.solar ?? null;
  const roofline = payload?.roofline ?? null;
  const obstructions = payload?.obstructions ?? null;

  return (
    <div className="px-4 pb-4 pt-1 sm:px-6">
      <div className="surface overflow-hidden rounded-2xl p-6 sm:p-7">
        {/* Top: estimate + roof plan */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Quote {lead.id}
            </p>
            <p className="font-display mt-2 text-3xl font-semibold text-ink">
              {formatQuoteRange(lead.quoteMinExVat, lead.quoteMaxExVat)}
              <span className="ml-2 align-middle text-sm font-medium text-muted">
                ex. VAT
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">
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
          </div>

          <div className="h-56 lg:h-full">
            {loading ? (
              <div className="h-full min-h-[220px] animate-pulse rounded-xl bg-black/[0.04]" />
            ) : (
              <RoofPlan payload={payload} />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-line" />

        {/* Contact · Property · Lead details */}
        <div className="grid gap-6 divide-line sm:grid-cols-3 sm:gap-0 sm:divide-x">
          {/* Contact */}
          <div className="sm:pr-8">
            <ColLabel>Contact</ColLabel>
            <div className="space-y-3">
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
            </div>
            {lead.contactPhone.trim() && isSafeTelHref(lead.contactPhone) && (
              <a
                href={whatsappLink(lead.contactPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#25D366] bg-white px-4 py-2.5 text-sm font-semibold text-[#128a3f] shadow-[0_6px_16px_-8px_rgba(37,211,102,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#25D366]/10"
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.41 9.43-9.41 2.52 0 4.88.98 6.66 2.76a9.35 9.35 0 0 1 2.76 6.66c-.01 5.19-4.24 9.41-9.4 9.41zm8.02-17.43A11.28 11.28 0 0 0 12.04.75C5.8.75.72 5.83.72 12.07c0 1.99.52 3.94 1.51 5.66L.63 23.5l5.9-1.55a11.3 11.3 0 0 0 5.5 1.4h.01c6.24 0 11.32-5.08 11.32-11.32 0-3.03-1.18-5.87-3.3-8z" />
                </svg>
                WhatsApp {lead.contactName.split(" ")[0]}
              </a>
            )}
          </div>

          {/* Property */}
          <div className="sm:px-8">
            <ColLabel>Property</ColLabel>
            <div className="flex items-start gap-2.5 py-1">
              <span className="mt-0.5 text-muted">{Icons.pin}</span>
              <span className="text-sm font-semibold text-ink">
                {lead.addressFormatted || EMPTY}
              </span>
            </div>
            <div className="flex items-center gap-2.5 py-2">
              <span className="text-muted">{Icons.postcode}</span>
              <span className="text-sm font-medium text-ink-soft">
                {lead.addressPostcode || EMPTY}
              </span>
            </div>
          </div>

          {/* Lead details */}
          <div className="sm:pl-8">
            <ColLabel>Lead details</ColLabel>
            <div className="divide-y divide-line">
              <MetaRow
                icon={Icons.calendar}
                label="Received"
                value={formatDateTime(lead.receivedAt)}
              />
              <MetaRow
                icon={Icons.layers}
                label="Material"
                value={materialLabel(payload?.material)}
              />
              <MetaRow
                icon={Icons.alert}
                label="Condition"
                value={conditionLabel(payload?.conditionAnswer)}
              />
            </div>
          </div>
        </div>

        {/* Survey figures straight off the payload */}
        <div className="mt-6 border-t border-line pt-5">
          <ColLabel>Survey</ColLabel>

          {error ? (
            <p className="text-sm text-red-700">
              Couldn’t load the full detail for this lead: {error}
            </p>
          ) : loading ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-black/[0.06]" />
                  <div className="h-3.5 w-12 animate-pulse rounded bg-black/[0.06]" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Figure label="Roof area" value={formatArea(solar?.areaM2)} />
                <Figure
                  label="Ground area"
                  value={formatArea(solar?.groundAreaM2)}
                />
                <Figure label="Pitch" value={formatPitch(solar?.pitchDegrees)} />
                <Figure
                  label="Roof type"
                  value={roofTypeLabel(solar?.roofType)}
                />
                <Figure
                  label="Gutter run"
                  value={formatLength(roofline?.gutterLengthM)}
                />
                <Figure
                  label="Roofline scope"
                  value={rooflineScopeLabel(roofline?.scope)}
                />
                <Figure
                  label="Chimneys"
                  value={formatCount(obstructions?.chimneys)}
                />
                <Figure
                  label="Rooflights"
                  value={formatCount(obstructions?.rooflights)}
                />
              </div>

              <p className="mt-4 text-xs text-muted">
                Measured by {payloadLabel(solar?.measurementMethod)} · imagery{" "}
                {payloadLabel(solar?.imageryQuality).toLowerCase()}
                {solar?.imageryDate
                  ? `, captured ${formatDateOnly(solar.imageryDate)}`
                  : ""}
                . Gutter and obstruction figures are totals — the widget does not
                store where the customer marked them.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
