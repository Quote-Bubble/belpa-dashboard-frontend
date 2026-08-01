"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

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

const ACCESS_OPTIONS: {
  value: AccessMode;
  label: string;
  hint: string;
}[] = [
  {
    value: "scaffold_weeks",
    label: "Scaffold",
    hint: "Storeys → weeks × £/week",
  },
  {
    value: "fixed_access",
    label: "Fixed allowance",
    hint: "One access figure",
  },
  {
    value: "mewp_day",
    label: "MEWP",
    hint: "Cherry picker day rate",
  },
  {
    value: "tower",
    label: "Tower",
    hint: "Adjustable height kit",
  },
  { value: "none", label: "None", hint: "No access line" },
];

function MoneyField({
  value,
  onChange,
  suffix,
  disabled,
  large,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  disabled?: boolean;
  large?: boolean;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <div
      className={[
        "group flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 transition-[border-color,box-shadow]",
        large ? "py-3" : "py-2",
        disabled
          ? "opacity-40"
          : "focus-within:border-brand-400 focus-within:shadow-[0_0_0_3px_rgba(47,107,255,0.12)]",
      ].join(" ")}
    >
      <span className="text-sm font-medium text-muted">£</span>
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
        className={[
          "w-full min-w-0 bg-transparent font-semibold tabular-nums text-ink outline-none",
          large ? "text-lg" : "text-sm",
        ].join(" ")}
      />
      {suffix && (
        <span className="shrink-0 text-xs font-medium text-muted">{suffix}</span>
      )}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-brand-600" : "bg-black/[0.08]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function ProgressRing({
  complete,
  total,
}: {
  complete: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100);
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const ready = total > 0 && complete === total;

  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-14 w-14 place-items-center">
        <svg width="56" height="56" className="-rotate-90" aria-hidden>
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="rgba(10,11,13,0.06)"
            strokeWidth="5"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={ready ? "#128a4d" : "#2f6bff"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="absolute font-display text-sm font-semibold tabular-nums text-ink">
          {total === 0 ? "—" : `${complete}/${total}`}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">
          {ready
            ? "Ready for live"
            : total === 0
              ? "Pick a service"
              : "Still setting rates"}
        </p>
        <p className="text-xs text-muted">
          {ready
            ? "Bubble can go live with these numbers"
            : "Walk through each enabled service"}
        </p>
      </div>
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
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          How they get on the roof
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Scaffold, tower, MEWP — or no access charge at all.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ACCESS_OPTIONS.map((o) => {
          const active = value.mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
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
                "rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                active
                  ? "border-brand-500 bg-gradient-to-b from-brand-50 to-white shadow-[0_8px_24px_-12px_rgba(31,87,240,0.45)]"
                  : "border-line bg-white hover:border-ink/15",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold text-ink">
                {o.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {o.hint}
              </span>
            </button>
          );
        })}
      </div>
      {value.mode !== "none" && (
        <div className="max-w-[220px]">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">
            {value.mode === "scaffold_weeks" ? "Per week" : "Access rate"}
          </label>
          <MoneyField
            large
            value={value.rateExVat}
            onChange={(n) => onChange({ ...value, rateExVat: n })}
            suffix={value.mode === "scaffold_weeks" ? "/wk" : ""}
          />
        </div>
      )}
    </div>
  );
}

function MaterialRows({
  materials,
  onChange,
}: {
  materials: ReplacementServiceConfig["materials"];
  onChange: (m: ReplacementServiceConfig["materials"]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {materials.map((m, i) => (
        <div
          key={m.key}
          className={[
            "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5",
            i > 0 ? "border-t border-line" : "",
            m.enabled ? "" : "bg-black/[0.015]",
          ].join(" ")}
        >
          <Switch
            checked={m.enabled}
            label={m.label}
            hint={m.enabled ? "Shown in the bubble" : "Hidden for this company"}
            onChange={(enabled) => {
              onChange(
                materials.map((x, j) => (j === i ? { ...x, enabled } : x)),
              );
            }}
          />
          <div className="w-40">
            <MoneyField
              value={m.rateExVat}
              disabled={!m.enabled}
              onChange={(rateExVat) => {
                onChange(
                  materials.map((x, j) =>
                    j === i ? { ...x, rateExVat } : x,
                  ),
                );
              }}
              suffix="/m²"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </h4>
      {children}
    </section>
  );
}

function ReplacementEditor({
  value,
  onChange,
}: {
  value: ReplacementServiceConfig;
  onChange: (v: ReplacementServiceConfig) => void;
}) {
  return (
    <div className="space-y-7">
      <SectionCard title="Coverings">
        <MaterialRows
          materials={value.materials}
          onChange={(materials) => onChange({ ...value, materials })}
        />
      </SectionCard>

      <SectionCard title="Job extras">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">
              Strip-off
            </label>
            <MoneyField
              value={value.stripOffPerM2}
              onChange={(stripOffPerM2) =>
                onChange({ ...value, stripOffPerM2 })
              }
              suffix="/m²"
            />
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-2">
            <Switch
              checked={value.includeSkip}
              label="Skip hire"
              onChange={(includeSkip) => onChange({ ...value, includeSkip })}
            />
            {value.includeSkip && (
              <div className="mt-2 pb-1">
                <MoneyField
                  value={value.skipHireExVat}
                  onChange={(skipHireExVat) =>
                    onChange({ ...value, skipHireExVat })
                  }
                />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-2">
            <Switch
              checked={value.includeGutters}
              label="Auto-price gutters"
              hint="When length is measured"
              onChange={(includeGutters) =>
                onChange({ ...value, includeGutters })
              }
            />
            {value.includeGutters && (
              <div className="mt-2 pb-1">
                <MoneyField
                  value={value.gutterPerMExVat}
                  onChange={(gutterPerMExVat) =>
                    onChange({ ...value, gutterPerMExVat })
                  }
                  suffix="/m"
                />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-2">
            <Switch
              checked={value.includeChimneyAllowance}
              label="Chimney flashing"
              onChange={(includeChimneyAllowance) =>
                onChange({ ...value, includeChimneyAllowance })
              }
            />
            {value.includeChimneyAllowance && (
              <div className="mt-2 pb-1">
                <MoneyField
                  value={value.chimneyAllowanceExVat}
                  onChange={(chimneyAllowanceExVat) =>
                    onChange({ ...value, chimneyAllowanceExVat })
                  }
                  suffix="/each"
                />
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <AccessEditor
        value={value.access}
        onChange={(access) => onChange({ ...value, access })}
      />
    </div>
  );
}

function RepairEditor({
  value,
  onChange,
}: {
  value: RepairServiceConfig;
  onChange: (v: RepairServiceConfig) => void;
}) {
  return (
    <div className="space-y-7">
      <SectionCard title="Repair coverings">
        <MaterialRows
          materials={value.materials}
          onChange={(materials) => onChange({ ...value, materials })}
        />
      </SectionCard>
      <AccessEditor
        value={value.access}
        onChange={(access) => onChange({ ...value, access })}
      />
    </div>
  );
}

function RooflineEditor({
  value,
  onChange,
}: {
  value: RooflineServiceConfig;
  onChange: (v: RooflineServiceConfig) => void;
}) {
  return (
    <div className="space-y-7">
      <SectionCard title="Linear rates">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">
              Gutters
            </label>
            <MoneyField
              large
              value={value.gutterPerMExVat}
              onChange={(gutterPerMExVat) =>
                onChange({ ...value, gutterPerMExVat })
              }
              suffix="/m"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">
              Fascias & soffits
            </label>
            <MoneyField
              large
              value={value.fasciaSoffitPerMExVat}
              onChange={(fasciaSoffitPerMExVat) =>
                onChange({ ...value, fasciaSoffitPerMExVat })
              }
              suffix="/m"
            />
          </div>
        </div>
      </SectionCard>
      <AccessEditor
        value={value.access}
        onChange={(access) => onChange({ ...value, access })}
      />
    </div>
  );
}

export default function QuoteConfigEditor({
  rooferId,
  initial,
  allowedOrigins: initialOrigins = [],
  showOrigins = false,
  onSaved,
}: {
  rooferId: string;
  initial: QuoteConfig;
  allowedOrigins?: string[];
  showOrigins?: boolean;
  onSaved?: () => void;
}) {
  const [config, setConfig] = useState<QuoteConfig>(initial);
  const [originsText, setOriginsText] = useState(initialOrigins.join("\n"));
  const [openService, setOpenService] = useState<ServiceKey>("full_replacement");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);

  const completeness = useMemo(() => assessCompleteness(config), [config]);

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
    setOpenService(key);
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
    setToast({
      message: "Pricing saved — their bubble uses these numbers.",
      tone: "ok",
    });
    onSaved?.();
  };

  const openMeta = SERVICE_CATALOG.find((s) => s.key === openService)!;
  const openEnabled = config.enabledServices.includes(openService);

  return (
    <div className="relative">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-4 h-56 rounded-[28px] opacity-90"
        style={{
          background:
            "radial-gradient(80% 120% at 10% 0%, rgba(47,107,255,0.14), transparent 55%), radial-gradient(60% 80% at 90% 20%, rgba(18,138,77,0.08), transparent 50%)",
        }}
      />

      <div className="relative space-y-6">
        {/* Hero */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
              Call playbook
            </p>
            <h2 className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
              Build their bubble
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Flip on the jobs they actually do, then set the rates for each
              one. Every company gets a unique quote flow.
            </p>
          </div>
          <ProgressRing
            complete={completeness.completePriced}
            total={completeness.enabledPriced}
          />
        </div>

        {!completeness.ready && completeness.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-semibold">On this call, still to finish</p>
            <ul className="mt-1.5 space-y-0.5 text-amber-900/90">
              {completeness.warnings.slice(0, 3).map((w) => (
                <li key={w}>— {w}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Split: services rail + editor */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-5">
          <aside className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Services
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SERVICE_CATALOG.map((s, idx) => {
                const enabled = config.enabledServices.includes(s.key);
                const active = openService === s.key;
                return (
                  <motion.div
                    key={s.key}
                    layout
                    className={[
                      "min-w-[220px] rounded-2xl border p-3 transition-colors lg:min-w-0",
                      active
                        ? "border-brand-500 bg-white shadow-[var(--shadow-soft)]"
                        : "border-transparent bg-white/60 hover:border-line hover:bg-white",
                      !enabled ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenService(s.key)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={[
                              "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
                              active
                                ? "bg-brand-600 text-white"
                                : "bg-black/[0.05] text-muted",
                            ].join(" ")}
                          >
                            {idx + 1}
                          </span>
                          <span className="truncate text-sm font-semibold text-ink">
                            {s.label}
                          </span>
                        </span>
                        <span className="mt-1 block pl-8 text-xs leading-snug text-muted">
                          {s.priced ? s.description : "Callback only"}
                        </span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`${enabled ? "Disable" : "Enable"} ${s.label}`}
                        onClick={() => toggleService(s.key)}
                        className={[
                          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
                          enabled ? "bg-brand-600" : "bg-black/[0.1]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                            enabled ? "translate-x-5" : "translate-x-0.5",
                          ].join(" ")}
                        />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </aside>

          <div className="overflow-hidden rounded-[24px] border border-line/80 bg-white shadow-[var(--shadow-soft)]">
            <div className="border-b border-line bg-gradient-to-r from-brand-50/80 via-white to-white px-5 py-4 sm:px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={openService}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
                    {openEnabled ? "Editing" : "Off for this bubble"}
                  </p>
                  <h3 className="font-display mt-1 text-xl font-semibold tracking-tight text-ink">
                    {openMeta.label}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {openEnabled
                      ? openMeta.priced
                        ? "Set only what this service needs — leave the rest alone."
                        : "No rates. Homeowners who pick this become a callback lead."
                      : "Toggle this service on in the list to configure it."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${openService}-${openEnabled}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  {!openEnabled ? (
                    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-black/[0.015] px-5 py-8">
                      <p className="text-sm text-ink-soft">
                        This job won’t appear in their quote bubble until you
                        turn it on.
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleService(openService)}
                        className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
                      >
                        Enable {openMeta.label}
                      </button>
                    </div>
                  ) : (
                    <>
                      {openService === "full_replacement" &&
                        config.services.full_replacement && (
                          <ReplacementEditor
                            value={config.services.full_replacement}
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
                          <ReplacementEditor
                            value={config.services.flat_roof_replacement}
                            onChange={(flat_roof_replacement) =>
                              setConfig((c) => ({
                                ...c,
                                services: {
                                  ...c.services,
                                  flat_roof_replacement,
                                },
                              }))
                            }
                          />
                        )}
                      {openService === "tile_or_slate_repair" &&
                        config.services.tile_or_slate_repair && (
                          <RepairEditor
                            value={config.services.tile_or_slate_repair}
                            onChange={(tile_or_slate_repair) =>
                              setConfig((c) => ({
                                ...c,
                                services: {
                                  ...c.services,
                                  tile_or_slate_repair,
                                },
                              }))
                            }
                          />
                        )}
                      {openService === "gutters_fascias_soffits" &&
                        config.services.gutters_fascias_soffits && (
                          <RooflineEditor
                            value={config.services.gutters_fascias_soffits}
                            onChange={(gutters_fascias_soffits) =>
                              setConfig((c) => ({
                                ...c,
                                services: {
                                  ...c.services,
                                  gutters_fascias_soffits,
                                },
                              }))
                            }
                          />
                        )}
                      {!openMeta.priced && (
                        <p className="text-sm leading-relaxed text-ink-soft">
                          Perfect for leaks and odd jobs — they leave details,
                          you call back. No instant estimate.
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Company options + save */}
        <div className="rounded-[24px] border border-line/80 bg-white/90 p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line px-3 py-2">
                <Switch
                  checked={config.vatRegistered}
                  label="VAT registered"
                  hint="Quotes shown ex VAT"
                  onChange={(vatRegistered) =>
                    setConfig((c) => ({ ...c, vatRegistered }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                  Confidence band{" "}
                  <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="field w-full rounded-xl px-3 py-2.5 text-sm text-ink outline-none"
                  placeholder="e.g. 0.12 for ±12%"
                  value={
                    config.confidenceWidth == null
                      ? ""
                      : String(config.confidenceWidth)
                  }
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === "") {
                      setConfig((c) => ({ ...c, confidenceWidth: null }));
                      return;
                    }
                    const n = Number(v);
                    if (Number.isFinite(n) && n >= 0 && n <= 0.5) {
                      setConfig((c) => ({ ...c, confidenceWidth: n }));
                    }
                  }}
                />
              </div>
              {showOrigins && (
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                    Allowed embed sites{" "}
                    <span className="text-muted">(one per line; blank = anywhere)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="field w-full rounded-xl px-3 py-2.5 text-sm text-ink outline-none"
                    placeholder="https://ridgewayroofing.co.uk"
                    value={originsText}
                    onChange={(e) => setOriginsText(e.target.value)}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="btn-primary shrink-0 rounded-full px-7 py-3 text-sm font-semibold shadow-[0_12px_28px_-12px_rgba(31,87,240,0.7)] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save bubble pricing"}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
