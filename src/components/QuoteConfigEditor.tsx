"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SERVICE_CATALOG,
  assessCompleteness,
  type AccessMode,
  type AccessPolicy,
  type QuoteConfig,
  type ReplacementServiceConfig,
  type RepairServiceConfig,
  type RooflineServiceConfig,
  type ServiceKey,
  defaultReplacementFlat,
  defaultReplacementPitched,
  defaultRepair,
  defaultRoofline,
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
      className={[
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-out",
        checked ? "bg-brand-600" : "bg-[#e9e9eb]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white",
          "shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)]",
          "transition-transform duration-200 ease-out",
          checked ? "translate-x-[20px]" : "translate-x-0",
        ].join(" ")}
      />
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
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-black/[0.015] sm:px-6 sm:py-[1.125rem]"
        aria-expanded={open}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">
            {title}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">{subtitle}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          className={[
            "shrink-0 text-muted transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        >
          <path
            d="M2.5 4.5 L6 8 L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="border-t border-line bg-[#fafbfc] px-5 py-5 sm:px-6">
          {children}
        </div>
      ) : null}
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
                "rounded-lg px-2 py-2.5 text-[13px] font-semibold transition-all",
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {value.mode !== "none" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>
      ) : (
        <p className="text-[13px] text-muted">No access line on quotes.</p>
      )}
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
    <div
      className={[
        "flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0",
        material.enabled ? "bg-white" : "bg-black/[0.015]",
      ].join(" ")}
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
      <MoneyField
        value={material.rateExVat}
        disabled={!material.enabled}
        onChange={onRate}
        suffix="/m²"
      />
    </div>
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

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
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
      </button>
    );
  }

  return (
    <div className="space-y-3">
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
          {enabled.map((m) => (
            <MaterialRow
              key={m.key}
              material={m}
              onToggle={(on) => updateAtKey(m.key, { enabled: on })}
              onRate={(rateExVat) => updateAtKey(m.key, { rateExVat })}
            />
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className={showOff ? "rotate-180" : ""}
              aria-hidden
            >
              <path
                d="M2.5 4.5 L6 8 L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {showOff ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
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
      {checked ? (
        <MoneyField value={value} onChange={onRate} suffix={suffix} />
      ) : (
        <span className="text-[12px] text-muted">Off</span>
      )}
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className={showOff ? "rotate-180" : ""}
              aria-hidden
            >
              <path
                d="M2.5 4.5 L6 8 L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {showOff ? (
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function QuoteConfigEditor({
  rooferId,
  initial,
  allowedOrigins: initialOrigins = [],
  showOrigins = false,
  previewUrl,
  onSaved,
}: {
  rooferId: string;
  initial: QuoteConfig;
  allowedOrigins?: string[];
  showOrigins?: boolean;
  previewUrl?: string;
  onSaved?: () => void;
}) {
  const [config, setConfig] = useState<QuoteConfig>(initial);
  const [baseline, setBaseline] = useState<QuoteConfig>(initial);
  const [originsText, setOriginsText] = useState(initialOrigins.join("\n"));
  const [originsBaseline, setOriginsBaseline] = useState(
    initialOrigins.join("\n"),
  );
  const [openService, setOpenService] =
    useState<ServiceKey>("full_replacement");
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);

  const completeness = useMemo(() => assessCompleteness(config), [config]);
  const dirty =
    JSON.stringify(config) !== JSON.stringify(baseline) ||
    originsText !== originsBaseline;

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

    if (!error && showOrigins) {
      const origins = originsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { error: oErr } = await supabase
        .from("roofers")
        .update({ allowed_origins: origins })
        .eq("id", rooferId);
      if (oErr) {
        setSaving(false);
        setToast({ message: oErr.message, tone: "error" });
        return;
      }
    }

    setSaving(false);
    if (error) {
      setToast({ message: error.message, tone: "error" });
      return;
    }
    setBaseline(config);
    setOriginsBaseline(originsText);
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
    <div className="flex flex-col items-start gap-3 px-5 py-8 sm:px-6">
      <p className="text-sm text-muted">
        This job won&apos;t appear in their quote bubble until you turn it on.
      </p>
      <button
        type="button"
        onClick={() => toggleService(openService)}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Turn on {openMeta.label}
      </button>
    </div>
  ) : !openMeta.priced ? (
    <div className="px-5 py-8 text-sm leading-relaxed text-muted sm:px-6">
      Homeowners who pick this leave details for a call-back. No instant
      estimate.
    </div>
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
    </>
  );

  return (
    <div className="-mx-1 sm:-mx-0">
      {/* Two equal-height cards; content vertically centred in each */}
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:gap-6">
        <aside className="flex flex-col justify-center overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(10,11,13,0.04)]">
          <div className="w-full">
            <div className="border-b border-line px-5 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Services
              </h2>
              <p className="mt-1 text-sm text-muted">
                Turn on the services this company offers.
              </p>
            </div>
            <ul>
              {SERVICE_CATALOG.map((s) => {
                const enabled = config.enabledServices.includes(s.key);
                const active = openService === s.key;
                return (
                  <li key={s.key}>
                    <div
                      className={[
                        "relative flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0",
                        active ? "bg-brand-50/70" : "hover:bg-black/[0.015]",
                      ].join(" ")}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-600"
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
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col justify-center overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(10,11,13,0.04)]">
          <div className="w-full">
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3.5">
                <ServiceIcon service={openService} large />
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

            <div className="border-t border-line">
              <button
                type="button"
                onClick={() => setCompanyOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
                aria-expanded={companyOpen}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink">
                    Company settings
                  </h3>
                  <p className="mt-0.5 text-[13px] text-muted">
                    VAT, quote range
                    {showOrigins ? ", embed sites" : ""}
                  </p>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 12 12"
                  className={[
                    "shrink-0 text-muted transition-transform",
                    companyOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden
                >
                  <path
                    d="M2.5 4.5 L6 8 L9.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {companyOpen ? (
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
                    {showOrigins ? (
                      <div className="rounded-xl border border-line px-3.5 py-3">
                        <p className="text-[14px] font-medium text-ink">
                          Allowed embed sites
                        </p>
                        <p className="mb-2 text-[12px] text-muted">
                          One per line · blank = anywhere
                        </p>
                        <textarea
                          rows={2}
                          className="w-full rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand-400"
                          placeholder="https://ridgewayroofing.co.uk"
                          value={originsText}
                          onChange={(e) => setOriginsText(e.target.value)}
                        />
                      </div>
                    ) : null}
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
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
                >
                  Preview
                  <ExternalIcon />
                </a>
              ) : null}
              <button
                type="button"
                disabled={saving || !dirty}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-45"
              >
                <SaveIcon />
                {saving ? "Saving…" : dirty ? "Save" : "Saved"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </div>
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
