"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import {
  CLEANING_SERVICE_KEYS,
  ROOFING_SERVICE_KEYS,
  SERVICE_CATALOG,
  assessCompleteness,
  type AccessMode,
  type AccessPolicy,
  type AreaCleanServiceConfig,
  type FlatServiceConfig,
  type QuoteConfig,
  type ReplacementServiceConfig,
  type RepairServiceConfig,
  type RooflineServiceConfig,
  type ServiceKey,
  defaultBiocide,
  defaultGutterClearing,
  defaultReplacementFlat,
  defaultReplacementPitched,
  defaultRepair,
  defaultRoofline,
  defaultSoftWash,
} from "@/lib/quote-config";
import Toast from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";

const ACCESS_OPTIONS: { value: AccessMode; label: string }[] = [
  { value: "scaffold_weeks", label: "Scaffold" },
  { value: "fixed_access", label: "Fixed" },
  { value: "mewp_day", label: "MEWP" },
  { value: "tower", label: "Tower" },
  { value: "none", label: "None" },
];

type SectionId = "coverings" | "extras" | "access" | "rates";
type OpenSection = SectionId | null;

const EASE = [0.22, 1, 0.36, 1] as const;
const springSoft = { type: "spring" as const, stiffness: 420, damping: 32 };
const expandTransition = { duration: 0.32, ease: EASE };

function Expand({
  open,
  children,
  className = "",
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="expand"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={expandTransition}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function IosSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <motion.span
        aria-hidden
        className="relative block h-[31px] w-[51px] shrink-0 rounded-full"
        initial={false}
        animate={{
          backgroundColor: checked ? "#1f57f0" : "#e9e9eb",
        }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        <motion.span
          aria-hidden
          className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)]"
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={springSoft}
        />
      </motion.span>
    </button>
  );
}

function MoneyField({
  value,
  onChange,
  suffix,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <label
      className={[
        "inline-flex h-10 min-w-[7rem] items-center gap-1 rounded-xl border border-line bg-white px-3",
        disabled ? "opacity-40" : "focus-within:border-brand-400",
      ].join(" ")}
    >
      <span className="text-sm text-muted">£</span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = Number(raw);
          if (!Number.isFinite(n) || n < 0) {
            setRaw(String(value));
            return;
          }
          setRaw(String(n));
          if (n !== value) onChange(n);
        }}
        className="w-full min-w-0 bg-transparent text-[15px] font-semibold tabular-nums text-ink outline-none"
      />
      {suffix ? (
        <span className="shrink-0 text-xs text-muted">{suffix}</span>
      ) : null}
    </label>
  );
}

/** Rate editor for an area-priced cleaning service (soft wash / biocide). */
function CleanAreaSection({
  value,
  onChange,
  rateLabel,
}: {
  value: AreaCleanServiceConfig;
  onChange: (v: AreaCleanServiceConfig) => void;
  rateLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-6 sm:px-6">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-ink">{rateLabel}</span>
        <MoneyField
          value={value.ratePerM2ExVat}
          suffix="/m²"
          onChange={(ratePerM2ExVat) => onChange({ ...value, ratePerM2ExVat })}
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-ink">Minimum call-out</span>
        <MoneyField
          value={value.minCalloutExVat}
          onChange={(minCalloutExVat) => onChange({ ...value, minCalloutExVat })}
        />
      </label>
      <p className="text-xs leading-relaxed text-muted">
        Ex-VAT. The homeowner draws their roof and we price the measured area at
        this rate, never below the minimum.
      </p>
    </div>
  );
}

/** Rate editor for a flat-price service (gutter clearing). */
function FlatSection({
  value,
  onChange,
}: {
  value: FlatServiceConfig;
  onChange: (v: FlatServiceConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-6 sm:px-6">
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-ink">Flat price</span>
        <MoneyField
          value={value.fixedExVat}
          onChange={(fixedExVat) => onChange({ ...value, fixedExVat })}
        />
      </label>
      <p className="text-xs leading-relaxed text-muted">
        Ex-VAT. One flat price shown to the homeowner — no measurement needed.
      </p>
    </div>
  );
}

function ServiceIcon({
  service,
  large,
}: {
  service: ServiceKey;
  large?: boolean;
}) {
  const size = large ? "h-12 w-12" : "h-10 w-10";
  const icon = large ? 22 : 18;
  return (
    <span
      className={[
        "grid shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600",
        size,
      ].join(" ")}
      aria-hidden
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
        {service === "full_replacement" ||
        service === "flat_roof_replacement" ? (
          <path
            d="M3 12 L12 4 L21 12 V20 H3 V12Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        ) : service === "tile_or_slate_repair" ? (
          <path
            d="M4 16 L8 8 L12 14 L16 6 L20 16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : service === "gutters_fascias_soffits" ? (
          <path
            d="M4 8 H20 M6 8 V16 M18 8 V16 M8 16 H16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        ) : service === "leak_investigation" ? (
          <path
            d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M12 5 V19 M5 12 H19"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        )}
      </svg>
    </span>
  );
}

function AccordionRow({
  open,
  onToggle,
  icon,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line last:border-b-0">
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.995 }}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-black/[0.015] sm:px-6 sm:py-[1.125rem]"
        aria-expanded={open}
      >
        <motion.span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"
          animate={{
            backgroundColor: open
              ? "rgba(47, 107, 255, 0.16)"
              : "rgba(47, 107, 255, 0.08)",
            scale: open ? 1.04 : 1,
          }}
          transition={springSoft}
        >
          {icon}
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">
            {title}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">{subtitle}</span>
        </span>
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          className="shrink-0 text-muted"
          animate={{ rotate: open ? 180 : 0 }}
          transition={springSoft}
          aria-hidden
        >
          <path
            d="M2.5 4.5 L6 8 L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </motion.svg>
      </motion.button>
      <Expand open={open}>
        <div className="border-t border-line bg-[#fafbfc] px-5 py-5 sm:px-6">
          <motion.div
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.28, ease: EASE, delay: 0.04 }}
          >
            {children}
          </motion.div>
        </div>
      </Expand>
    </div>
  );
}

function AccessEditor({
  value,
  onChange,
}: {
  value: AccessPolicy;
  onChange: (a: AccessPolicy) => void;
}) {
  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-1 rounded-xl bg-black/[0.04] p-1 sm:grid-cols-5"
        role="radiogroup"
        aria-label="Access type"
      >
        {ACCESS_OPTIONS.map((o) => {
          const active = value.mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                onChange({
                  mode: o.value,
                  rateExVat:
                    o.value === "none"
                      ? 0
                      : value.rateExVat ||
                        (o.value === "scaffold_weeks"
                          ? 625
                          : o.value === "mewp_day"
                            ? 280
                            : o.value === "tower"
                              ? 120
                              : 350),
                })
              }
              className={[
                "relative rounded-lg px-2 py-2.5 text-[13px] font-semibold transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {active ? (
                <motion.span
                  layoutId="access-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={springSoft}
                />
              ) : null}
              <span className="relative z-10">{o.label}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {value.mode !== "none" ? (
          <motion.div
            key="rate"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="text-[15px] font-medium text-ink">
                {value.mode === "scaffold_weeks" ? "Per week" : "Access rate"}
              </p>
              <p className="text-[13px] text-muted">
                {value.mode === "scaffold_weeks"
                  ? "Storeys map to weeks × this rate"
                  : "Added as a single line on the quote"}
              </p>
            </div>
            <MoneyField
              value={value.rateExVat}
              onChange={(n) => onChange({ ...value, rateExVat: n })}
              suffix={value.mode === "scaffold_weeks" ? "/wk" : ""}
            />
          </motion.div>
        ) : (
          <motion.p
            key="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[13px] text-muted"
          >
            No access line on quotes.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function MaterialRow({
  material,
  onToggle,
  onRate,
}: {
  material: ReplacementServiceConfig["materials"][number];
  onToggle: (enabled: boolean) => void;
  onRate: (rateExVat: number) => void;
}) {
  return (
    <motion.div
      layout
      className={[
        "flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0",
        material.enabled ? "bg-white" : "bg-black/[0.015]",
      ].join(" ")}
      animate={{ opacity: material.enabled ? 1 : 0.72 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <IosSwitch
          checked={material.enabled}
          label={`${material.enabled ? "Disable" : "Enable"} ${material.label}`}
          onChange={onToggle}
        />
        <span
          className={[
            "truncate text-[14px] font-medium",
            material.enabled ? "text-ink" : "text-muted",
          ].join(" ")}
        >
          {material.label}
        </span>
      </div>
      <motion.div
        animate={{
          opacity: material.enabled ? 1 : 0.45,
          scale: material.enabled ? 1 : 0.98,
        }}
        transition={{ duration: 0.18, ease: EASE }}
      >
        <MoneyField
          value={material.rateExVat}
          disabled={!material.enabled}
          onChange={onRate}
          suffix="/m²"
        />
      </motion.div>
    </motion.div>
  );
}

function MaterialList({
  materials,
  onChange,
}: {
  materials: ReplacementServiceConfig["materials"];
  onChange: (m: ReplacementServiceConfig["materials"]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showOff, setShowOff] = useState(false);
  const enabled = materials.filter((m) => m.enabled);
  const disabled = materials.filter((m) => !m.enabled);

  const updateAtKey = (
    key: string,
    patch: Partial<ReplacementServiceConfig["materials"][number]>,
  ) => {
    onChange(materials.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!editing ? (
        <motion.button
          key="summary"
          type="button"
          onClick={() => setEditing(true)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-left hover:border-brand-300 hover:bg-brand-50/40"
        >
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">
              {enabled.length === 0
                ? "No materials on"
                : `${enabled.length} material${enabled.length === 1 ? "" : "s"} priced`}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              {enabled.length === 0
                ? "Tap to choose what they offer"
                : enabled.map((m) => m.label).join(" · ")}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-semibold text-brand-600">
            Edit
          </span>
        </motion.button>
      ) : (
        <motion.div
          key="editor"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-muted">
              On for this bubble
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setShowOff(false);
              }}
              className="text-[12px] font-semibold text-brand-600"
            >
              Done
            </button>
          </div>

          {enabled.length === 0 ? (
            <p className="text-[13px] text-muted">
              Nothing on yet — turn materials on below.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              {enabled.map((m, i) => (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.22,
                    ease: EASE,
                    delay: i * 0.03,
                  }}
                >
                  <MaterialRow
                    material={m}
                    onToggle={(on) => updateAtKey(m.key, { enabled: on })}
                    onRate={(rateExVat) => updateAtKey(m.key, { rateExVat })}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {disabled.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowOff((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-line bg-white px-3.5 py-2.5 text-left text-[13px] font-semibold text-muted hover:border-ink/20 hover:text-ink"
              >
                <span>
                  {showOff ? "Hide" : "Show"} {disabled.length} material
                  {disabled.length === 1 ? "" : "s"} not offered
                </span>
                <motion.svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  animate={{ rotate: showOff ? 180 : 0 }}
                  transition={springSoft}
                  aria-hidden
                >
                  <path
                    d="M2.5 4.5 L6 8 L9.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </motion.svg>
              </button>
              <Expand open={showOff}>
                <div className="mt-2 overflow-hidden rounded-xl border border-line">
                  {disabled.map((m) => (
                    <MaterialRow
                      key={m.key}
                      material={m}
                      onToggle={(on) => updateAtKey(m.key, { enabled: on })}
                      onRate={(rateExVat) => updateAtKey(m.key, { rateExVat })}
                    />
                  ))}
                </div>
              </Expand>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleMoneyCard({
  checked,
  onToggle,
  label,
  hint,
  value,
  onRate,
  suffix,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  hint?: string;
  value: number;
  onRate: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <IosSwitch checked={checked} onChange={onToggle} label={label} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-ink">{label}</p>
          {hint ? <p className="text-[11px] text-muted">{hint}</p> : null}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {checked ? (
          <motion.div
            key="rate"
            initial={{ opacity: 0, scale: 0.96, x: 6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: 6 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <MoneyField value={value} onChange={onRate} suffix={suffix} />
          </motion.div>
        ) : (
          <motion.span
            key="off"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[12px] text-muted"
          >
            Off
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExtrasEditor({
  value,
  onChange,
}: {
  value: ReplacementServiceConfig;
  onChange: (v: ReplacementServiceConfig) => void;
}) {
  const [showOff, setShowOff] = useState(false);
  const toggles = [
    {
      key: "skip" as const,
      checked: value.includeSkip,
      label: "Skip hire",
      value: value.skipHireExVat,
      suffix: undefined as string | undefined,
    },
    {
      key: "gutters" as const,
      checked: value.includeGutters,
      label: "Gutters",
      hint: "When length is measured",
      value: value.gutterPerMExVat,
      suffix: "/m",
    },
    {
      key: "chimney" as const,
      checked: value.includeChimneyAllowance,
      label: "Chimney flashing",
      value: value.chimneyAllowanceExVat,
      suffix: "/each",
    },
  ];
  const onToggles = toggles.filter((t) => t.checked);
  const offToggles = toggles.filter((t) => !t.checked);

  const applyToggle = (
    key: "skip" | "gutters" | "chimney",
    checked: boolean,
  ) => {
    if (key === "skip") onChange({ ...value, includeSkip: checked });
    if (key === "gutters") onChange({ ...value, includeGutters: checked });
    if (key === "chimney")
      onChange({ ...value, includeChimneyAllowance: checked });
  };
  const applyRate = (
    key: "skip" | "gutters" | "chimney",
    rate: number,
  ) => {
    if (key === "skip") onChange({ ...value, skipHireExVat: rate });
    if (key === "gutters") onChange({ ...value, gutterPerMExVat: rate });
    if (key === "chimney") onChange({ ...value, chimneyAllowanceExVat: rate });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-3 py-2.5">
          <div>
            <p className="text-[14px] font-medium text-ink">Strip-off</p>
            <p className="text-[11px] text-muted">Per square metre</p>
          </div>
          <MoneyField
            value={value.stripOffPerM2}
            onChange={(stripOffPerM2) =>
              onChange({ ...value, stripOffPerM2 })
            }
            suffix="/m²"
          />
        </div>
        {onToggles.map((t) => (
          <ToggleMoneyCard
            key={t.key}
            checked={t.checked}
            onToggle={(v) => applyToggle(t.key, v)}
            label={t.label}
            hint={"hint" in t ? t.hint : undefined}
            value={t.value}
            onRate={(n) => applyRate(t.key, n)}
            suffix={t.suffix}
          />
        ))}
      </div>

      {offToggles.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowOff((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-line bg-white px-3.5 py-2.5 text-left text-[13px] font-semibold text-muted hover:border-ink/20 hover:text-ink"
          >
            <span>
              {showOff ? "Hide" : "Show"} {offToggles.length} extra
              {offToggles.length === 1 ? "" : "s"} turned off
            </span>
            <motion.svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              animate={{ rotate: showOff ? 180 : 0 }}
              transition={springSoft}
              aria-hidden
            >
              <path
                d="M2.5 4.5 L6 8 L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </motion.svg>
          </button>
          <Expand open={showOff}>
            <div className="mt-2 overflow-hidden rounded-xl border border-line">
              {offToggles.map((t) => (
                <ToggleMoneyCard
                  key={t.key}
                  checked={t.checked}
                  onToggle={(v) => applyToggle(t.key, v)}
                  label={t.label}
                  hint={"hint" in t ? t.hint : undefined}
                  value={t.value}
                  onRate={(n) => applyRate(t.key, n)}
                  suffix={t.suffix}
                />
              ))}
            </div>
          </Expand>
        </div>
      ) : null}
    </div>
  );
}

export default function QuoteConfigEditor({
  rooferId,
  initial,
  previewUrl,
  onSaved,
}: {
  rooferId: string;
  initial: QuoteConfig;
  previewUrl?: string;
  onSaved?: () => void;
}) {
  const [config, setConfig] = useState<QuoteConfig>(initial);
  const [baseline, setBaseline] = useState<QuoteConfig>(initial);
  const [openService, setOpenService] = useState<ServiceKey>(
    CLEANING_SERVICE_KEYS.some((k) => initial.enabledServices.includes(k))
      ? CLEANING_SERVICE_KEYS[0]
      : ROOFING_SERVICE_KEYS[0],
  );
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);

  const completeness = useMemo(() => assessCompleteness(config), [config]);
  const dirty = JSON.stringify(config) !== JSON.stringify(baseline);

  // Which niche is this company set up as — only that group's services show.
  const nicheKeys = CLEANING_SERVICE_KEYS.some((k) =>
    config.enabledServices.includes(k),
  )
    ? CLEANING_SERVICE_KEYS
    : ROOFING_SERVICE_KEYS;
  const visibleServices = SERVICE_CATALOG.filter((s) =>
    nicheKeys.includes(s.key),
  );

  const openMeta = SERVICE_CATALOG.find((s) => s.key === openService)!;
  const openEnabled = config.enabledServices.includes(openService);

  const selectService = (key: ServiceKey) => {
    setOpenService(key);
    setOpenSection(null);
  };

  const toggleService = (key: ServiceKey) => {
    setConfig((c) => {
      const on = c.enabledServices.includes(key);
      const enabledServices = on
        ? c.enabledServices.filter((k) => k !== key)
        : [...c.enabledServices, key];
      const services = { ...c.services };
      if (!on) {
        if (key === "full_replacement" && !services.full_replacement) {
          services.full_replacement = defaultReplacementPitched();
        }
        if (key === "flat_roof_replacement" && !services.flat_roof_replacement) {
          services.flat_roof_replacement = defaultReplacementFlat();
        }
        if (key === "tile_or_slate_repair" && !services.tile_or_slate_repair) {
          services.tile_or_slate_repair = defaultRepair();
        }
        if (
          key === "gutters_fascias_soffits" &&
          !services.gutters_fascias_soffits
        ) {
          services.gutters_fascias_soffits = defaultRoofline();
        }
        if (key === "roof_soft_wash" && !services.roof_soft_wash) {
          services.roof_soft_wash = defaultSoftWash();
        }
        if (
          key === "roof_biocide_treatment" &&
          !services.roof_biocide_treatment
        ) {
          services.roof_biocide_treatment = defaultBiocide();
        }
        if (key === "gutter_clearing" && !services.gutter_clearing) {
          services.gutter_clearing = defaultGutterClearing();
        }
      }
      return { ...c, enabledServices, services };
    });
    selectService(key);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("roofer_pricing").upsert(
      {
        roofer_id: rooferId,
        quote_config: config,
        vat_registered: config.vatRegistered,
      },
      { onConflict: "roofer_id" },
    );

    setSaving(false);
    if (error) {
      setToast({ message: error.message, tone: "error" });
      return;
    }
    setBaseline(config);
    setToast({
      message: "Pricing saved — their bubble uses these rates.",
      tone: "ok",
    });
    onSaved?.();
  };

  const toggleSection = (id: SectionId) => {
    setOpenSection((cur) => (cur === id ? null : id));
  };

  const missingCount = Math.max(
    0,
    completeness.enabledPriced - completeness.completePriced,
  );

  const serviceBody = !openEnabled ? (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="flex flex-col items-start gap-3 px-5 py-8 sm:px-6"
    >
      <p className="text-sm text-muted">
        This job won&apos;t appear in their quote bubble until you turn it on.
      </p>
      <motion.button
        type="button"
        onClick={() => toggleService(openService)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Turn on {openMeta.label}
      </motion.button>
    </motion.div>
  ) : !openMeta.priced ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="px-5 py-8 text-sm leading-relaxed text-muted sm:px-6"
    >
      Homeowners who pick this leave details for a call-back. No instant
      estimate.
    </motion.div>
  ) : (
    <>
      {openService === "full_replacement" &&
        config.services.full_replacement && (
          <ReplacementSections
            value={config.services.full_replacement}
            openSection={openSection}
            onSection={toggleSection}
            onChange={(full_replacement) =>
              setConfig((c) => ({
                ...c,
                services: { ...c.services, full_replacement },
              }))
            }
          />
        )}
      {openService === "flat_roof_replacement" &&
        config.services.flat_roof_replacement && (
          <ReplacementSections
            value={config.services.flat_roof_replacement}
            openSection={openSection}
            onSection={toggleSection}
            onChange={(flat_roof_replacement) =>
              setConfig((c) => ({
                ...c,
                services: { ...c.services, flat_roof_replacement },
              }))
            }
          />
        )}
      {openService === "tile_or_slate_repair" &&
        config.services.tile_or_slate_repair && (
          <RepairSections
            value={config.services.tile_or_slate_repair}
            openSection={openSection}
            onSection={toggleSection}
            onChange={(tile_or_slate_repair) =>
              setConfig((c) => ({
                ...c,
                services: { ...c.services, tile_or_slate_repair },
              }))
            }
          />
        )}
      {openService === "gutters_fascias_soffits" &&
        config.services.gutters_fascias_soffits && (
          <RooflineSections
            value={config.services.gutters_fascias_soffits}
            openSection={openSection}
            onSection={toggleSection}
            onChange={(gutters_fascias_soffits) =>
              setConfig((c) => ({
                ...c,
                services: { ...c.services, gutters_fascias_soffits },
              }))
            }
          />
        )}
      {openService === "roof_soft_wash" && config.services.roof_soft_wash && (
        <CleanAreaSection
          value={config.services.roof_soft_wash}
          rateLabel="Soft wash rate"
          onChange={(roof_soft_wash) =>
            setConfig((c) => ({
              ...c,
              services: { ...c.services, roof_soft_wash },
            }))
          }
        />
      )}
      {openService === "roof_biocide_treatment" &&
        config.services.roof_biocide_treatment && (
          <CleanAreaSection
            value={config.services.roof_biocide_treatment}
            rateLabel="Biocide rate"
            onChange={(roof_biocide_treatment) =>
              setConfig((c) => ({
                ...c,
                services: { ...c.services, roof_biocide_treatment },
              }))
            }
          />
        )}
      {openService === "gutter_clearing" && config.services.gutter_clearing && (
        <FlatSection
          value={config.services.gutter_clearing}
          onChange={(gutter_clearing) =>
            setConfig((c) => ({
              ...c,
              services: { ...c.services, gutter_clearing },
            }))
          }
        />
      )}
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="-mx-1 sm:-mx-0">
        {/*
          Flex + items-stretch makes both columns the same height.
          Gap between editor and company stays. Buttons sit below so
          Services bottom lines up with Company settings bottom.
        */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(10,11,13,0.04)] lg:w-[340px]"
          >
            <div className="border-b border-line px-5 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Services
              </h2>
              <p className="mt-1 text-sm text-muted">
                Turn on the services this company offers.
              </p>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted">
                  Set up as
                </p>
                <div className="flex gap-1.5">
                  {(
                    [
                      { label: "Roofing", keys: ROOFING_SERVICE_KEYS },
                      { label: "Roof cleaning", keys: CLEANING_SERVICE_KEYS },
                    ] as const
                  ).map((preset) => {
                    const active =
                      preset.keys.every((k) =>
                        config.enabledServices.includes(k),
                      ) &&
                      config.enabledServices.every((k) =>
                        preset.keys.includes(k),
                      );
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setConfig((c) => ({
                            ...c,
                            enabledServices: [...preset.keys],
                          }));
                          setOpenService(preset.keys[0]);
                          setOpenSection(null);
                        }}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? "bg-brand-600 text-white"
                            : "bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]",
                        ].join(" ")}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <ul>
              {visibleServices.map((s, i) => {
                const enabled = config.enabledServices.includes(s.key);
                const active = openService === s.key;
                return (
                  <motion.li
                    key={s.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.32,
                      ease: EASE,
                      delay: 0.05 + i * 0.04,
                    }}
                  >
                    <motion.div
                      className={[
                        "relative flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0",
                        active ? "bg-brand-50/70" : "hover:bg-black/[0.015]",
                      ].join(" ")}
                      animate={{
                        backgroundColor: active
                          ? "rgba(47, 107, 255, 0.07)"
                          : "rgba(255, 255, 255, 0)",
                      }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      {active ? (
                        <motion.span
                          layoutId="service-rail"
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-600"
                          transition={springSoft}
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => selectService(s.key)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <ServiceIcon service={s.key} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-ink">
                            {s.label}
                          </span>
                          {!s.priced ? (
                            <span className="mt-0.5 block text-[11px] text-muted">
                              Callback only
                            </span>
                          ) : null}
                        </span>
                      </button>
                      <IosSwitch
                        checked={enabled}
                        label={`${enabled ? "Disable" : "Enable"} ${s.label}`}
                        onChange={() => toggleService(s.key)}
                      />
                    </motion.div>
                  </motion.li>
                );
              })}
            </ul>
            <div className="min-h-0 flex-1" aria-hidden />
          </motion.aside>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE, delay: 0.08 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(10,11,13,0.04)]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={openService}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="border-b border-line px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3.5">
                      <motion.div
                        key={`${openService}-icon`}
                        initial={{ scale: 0.88, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={springSoft}
                      >
                        <ServiceIcon service={openService} large />
                      </motion.div>
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold tracking-tight text-ink">
                          {openMeta.label}
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          {openEnabled
                            ? openMeta.priced
                              ? openMeta.description
                              : "Callback only — no rates to set"
                            : "Off for this bubble"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {serviceBody}
                  <div className="min-h-0 flex-1" aria-hidden />
                </motion.div>
              </AnimatePresence>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE, delay: 0.16 }}
              className="shrink-0 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(10,11,13,0.04)]"
            >
              <motion.button
                type="button"
                onClick={() => setCompanyOpen((v) => !v)}
                whileTap={{ scale: 0.995 }}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
                aria-expanded={companyOpen}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink">
                    Company settings
                  </h3>
                  <p className="mt-0.5 text-[13px] text-muted">
                    VAT, quote range
                  </p>
                </div>
                <motion.svg
                  width="14"
                  height="14"
                  viewBox="0 0 12 12"
                  className="shrink-0 text-muted"
                  animate={{ rotate: companyOpen ? 180 : 0 }}
                  transition={springSoft}
                  aria-hidden
                >
                  <path
                    d="M2.5 4.5 L6 8 L9.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </motion.svg>
              </motion.button>
              <Expand open={companyOpen}>
                <div className="grid gap-4 border-t border-line px-5 py-5 sm:px-6 lg:grid-cols-[1fr_200px]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
                      <div>
                        <p className="text-[14px] font-medium text-ink">
                          VAT registered
                        </p>
                        <p className="text-[12px] text-muted">
                          Quotes shown ex VAT
                        </p>
                      </div>
                      <IosSwitch
                        checked={config.vatRegistered}
                        label="VAT registered"
                        onChange={(vatRegistered) =>
                          setConfig((c) => ({ ...c, vatRegistered }))
                        }
                      />
                    </div>
                    <div className="rounded-xl border border-line px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-medium text-ink">
                            Quote range width
                          </p>
                          <p className="text-[12px] text-muted">
                            Optional · how wide the £ range is
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="h-10 w-20 rounded-xl border border-line px-3 text-[15px] tabular-nums text-ink outline-none focus:border-brand-400"
                            placeholder="Auto"
                            value={
                              config.confidenceWidth == null
                                ? ""
                                : String(config.confidenceWidth)
                            }
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              if (v === "") {
                                setConfig((c) => ({
                                  ...c,
                                  confidenceWidth: null,
                                }));
                                return;
                              }
                              const n = Number(v);
                              if (Number.isFinite(n) && n >= 0 && n <= 0.5) {
                                setConfig((c) => ({
                                  ...c,
                                  confidenceWidth: n,
                                }));
                              }
                            }}
                          />
                          <span className="text-[13px] font-medium text-muted">
                            {config.confidenceWidth != null
                              ? `±${Math.round(config.confidenceWidth * 100)}%`
                              : "±%"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-[#f7f8fa] px-3.5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Pricing status
                    </p>
                    <p className="mt-2 text-[13px] leading-snug text-ink-soft">
                      {completeness.enabledPriced === 0
                        ? "Enable a priced service to get started."
                        : completeness.ready
                          ? "All enabled services have rates set."
                          : `${missingCount} service${missingCount === 1 ? "" : "s"} still need rates.`}
                    </p>
                  </div>
                </div>
              </Expand>
            </motion.section>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.22 }}
          className="mt-5 flex justify-end gap-2"
        >
          {previewUrl ? (
            <motion.a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
            >
              Preview
              <ExternalIcon />
            </motion.a>
          ) : null}
          <motion.button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
            whileHover={dirty && !saving ? { y: -1, scale: 1.02 } : undefined}
            whileTap={dirty && !saving ? { scale: 0.98 } : undefined}
            animate={{
              opacity: dirty || saving ? 1 : 0.45,
              scale: dirty ? 1 : 0.98,
            }}
            transition={springSoft}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white disabled:pointer-events-none"
          >
            <SaveIcon />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={saving ? "saving" : dirty ? "save" : "saved"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: EASE }}
              >
                {saving ? "Saving…" : dirty ? "Save" : "Saved"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>

        <Toast
          message={toast?.message ?? null}
          tone={toast?.tone}
          onDone={() => setToast(null)}
        />
      </div>
    </MotionConfig>
  );
}

function ReplacementSections({
  value,
  onChange,
  openSection,
  onSection,
}: {
  value: ReplacementServiceConfig;
  onChange: (v: ReplacementServiceConfig) => void;
  openSection: OpenSection;
  onSection: (id: SectionId) => void;
}) {
  return (
    <>
      <AccordionRow
        open={openSection === "coverings"}
        onToggle={() => onSection("coverings")}
        icon={<LayersIcon />}
        title="Coverings"
        subtitle="Choose materials and set your rates"
      >
        <MaterialList
          materials={value.materials}
          onChange={(materials) => onChange({ ...value, materials })}
        />
      </AccordionRow>
      <AccordionRow
        open={openSection === "extras"}
        onToggle={() => onSection("extras")}
        icon={<SparkIcon />}
        title="Extras"
        subtitle="Strip-off, skip hire, gutters, chimney"
      >
        <ExtrasEditor value={value} onChange={onChange} />
      </AccordionRow>
      <AccordionRow
        open={openSection === "access"}
        onToggle={() => onSection("access")}
        icon={<LadderIcon />}
        title="Access"
        subtitle="How they get on the roof"
      >
        <AccessEditor
          value={value.access}
          onChange={(access) => onChange({ ...value, access })}
        />
      </AccordionRow>
    </>
  );
}

function RepairSections({
  value,
  onChange,
  openSection,
  onSection,
}: {
  value: RepairServiceConfig;
  onChange: (v: RepairServiceConfig) => void;
  openSection: OpenSection;
  onSection: (id: SectionId) => void;
}) {
  return (
    <>
      <AccordionRow
        open={openSection === "coverings"}
        onToggle={() => onSection("coverings")}
        icon={<LayersIcon />}
        title="Coverings"
        subtitle="Choose materials and set your rates"
      >
        <MaterialList
          materials={value.materials}
          onChange={(materials) => onChange({ ...value, materials })}
        />
      </AccordionRow>
      <AccordionRow
        open={openSection === "access"}
        onToggle={() => onSection("access")}
        icon={<LadderIcon />}
        title="Access"
        subtitle="How they get on the roof"
      >
        <AccessEditor
          value={value.access}
          onChange={(access) => onChange({ ...value, access })}
        />
      </AccordionRow>
    </>
  );
}

function RooflineSections({
  value,
  onChange,
  openSection,
  onSection,
}: {
  value: RooflineServiceConfig;
  onChange: (v: RooflineServiceConfig) => void;
  openSection: OpenSection;
  onSection: (id: SectionId) => void;
}) {
  return (
    <>
      <AccordionRow
        open={openSection === "rates" || openSection === "coverings"}
        onToggle={() => onSection("rates")}
        icon={<LayersIcon />}
        title="Linear rates"
        subtitle="Gutters, fascias and soffits"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
            <p className="text-[15px] font-medium text-ink">Gutters</p>
            <MoneyField
              value={value.gutterPerMExVat}
              onChange={(gutterPerMExVat) =>
                onChange({ ...value, gutterPerMExVat })
              }
              suffix="/m"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
            <p className="text-[15px] font-medium text-ink">
              Fascias & soffits
            </p>
            <MoneyField
              value={value.fasciaSoffitPerMExVat}
              onChange={(fasciaSoffitPerMExVat) =>
                onChange({ ...value, fasciaSoffitPerMExVat })
              }
              suffix="/m"
            />
          </div>
        </div>
      </AccordionRow>
      <AccordionRow
        open={openSection === "access"}
        onToggle={() => onSection("access")}
        icon={<LadderIcon />}
        title="Access"
        subtitle="How they get on the roof"
      >
        <AccessEditor
          value={value.access}
          onChange={(access) => onChange({ ...value, access })}
        />
      </AccordionRow>
    </>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M5 2 H2.5 A.5.5 0 0 0 2 2.5 v7 A.5.5 0 0 0 2.5 10 h7 A.5.5 0 0 0 10 9.5 V7 M7 2 h3 v3 M10 2 L5.5 6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M3 2.5 H9.5 L11.5 4.5 V11.5 A.5.5 0 0 1 11 12 H3 A.5.5 0 0 1 2.5 11.5 V3 A.5.5 0 0 1 3 2.5 Z M4.5 2.5 V5.5 H9 V2.5 M4.5 12 V8 H9.5 V12"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M2 7 L9 3 L16 7 L9 11 Z M2 10 L9 14 L16 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M9 2 V6 M9 12 V16 M2 9 H6 M12 9 H16 M4.2 4.2 L6.5 6.5 M11.5 11.5 L13.8 13.8 M13.8 4.2 L11.5 6.5 M6.5 11.5 L4.2 13.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LadderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M5 15 V3 M13 15 V3 M5 6 H13 M5 9.5 H13 M5 13 H13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
