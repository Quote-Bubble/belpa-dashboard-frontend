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

const ACCESS_OPTIONS: { value: AccessMode; label: string }[] = [
  { value: "scaffold_weeks", label: "Scaffold" },
  { value: "fixed_access", label: "Fixed" },
  { value: "mewp_day", label: "MEWP" },
  { value: "tower", label: "Tower" },
  { value: "none", label: "None" },
];

/** iOS-style switch — thumb always clipped inside the track. */
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
        "inline-flex h-9 min-w-[6.5rem] items-center gap-1 rounded-[10px] bg-black/[0.04] px-2.5",
        disabled ? "opacity-40" : "focus-within:bg-black/[0.06]",
      ].join(" ")}
    >
      <span className="text-[13px] text-[#8e8e93]">£</span>
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
        className="w-full min-w-0 bg-transparent text-[15px] font-medium tabular-nums text-ink outline-none"
      />
      {suffix ? (
        <span className="shrink-0 text-[12px] text-[#8e8e93]">{suffix}</span>
      ) : null}
    </label>
  );
}

function Group({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      {title ? (
        <h4 className="px-1 text-[12px] font-medium uppercase tracking-[0.04em] text-[#8e8e93]">
          {title}
        </h4>
      ) : null}
      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06]">
        {children}
      </div>
      {footer ? (
        <p className="px-1 text-[12px] leading-snug text-[#8e8e93]">{footer}</p>
      ) : null}
    </section>
  );
}

function Row({
  children,
  last,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={[
        "flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5",
        last ? "" : "border-b border-black/[0.06]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function ProgressPill({
  complete,
  total,
}: {
  complete: number;
  total: number;
}) {
  const ready = total > 0 && complete === total;
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium",
        ready
          ? "bg-[#e8f8ee] text-[#1b7a3d]"
          : "bg-black/[0.04] text-[#636366]",
      ].join(" ")}
    >
      <span className="tabular-nums">
        {total === 0 ? "—" : `${complete}/${total}`}
      </span>
      <span className="text-[12px] font-normal opacity-80">
        {ready ? "Ready" : total === 0 ? "Pick services" : "In progress"}
      </span>
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
    <Group
      title="Access"
      footer={
        value.mode === "scaffold_weeks"
          ? "Storeys map to weeks × your weekly rate."
          : value.mode === "none"
            ? "No access line is added to the quote."
            : "A single access figure is added to the quote."
      }
    >
      <div className="border-b border-black/[0.06] p-2">
        <div
          className="grid grid-cols-5 gap-0.5 rounded-[9px] bg-black/[0.05] p-0.5"
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
                  "rounded-[7px] px-1 py-1.5 text-[12px] font-semibold transition-all",
                  active
                    ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                    : "text-[#636366]",
                ].join(" ")}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
      {value.mode !== "none" ? (
        <Row last>
          <span className="text-[15px] text-ink">
            {value.mode === "scaffold_weeks" ? "Per week" : "Rate"}
          </span>
          <MoneyField
            value={value.rateExVat}
            onChange={(n) => onChange({ ...value, rateExVat: n })}
            suffix={value.mode === "scaffold_weeks" ? "/wk" : ""}
          />
        </Row>
      ) : null}
    </Group>
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
    <Group title="Coverings" footer="Turn off anything they don’t offer.">
      {materials.map((m, i) => (
        <Row key={m.key} last={i === materials.length - 1}>
          <div className="flex min-w-0 items-center gap-3">
            <IosSwitch
              checked={m.enabled}
              label={`${m.enabled ? "Disable" : "Enable"} ${m.label}`}
              onChange={(enabled) => {
                onChange(
                  materials.map((x, j) => (j === i ? { ...x, enabled } : x)),
                );
              }}
            />
            <span
              className={[
                "truncate text-[15px]",
                m.enabled ? "text-ink" : "text-[#8e8e93]",
              ].join(" ")}
            >
              {m.label}
            </span>
          </div>
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
        </Row>
      ))}
    </Group>
  );
}

function ToggleMoneyRow({
  checked,
  onToggle,
  label,
  value,
  onRate,
  suffix,
  last,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  value: number;
  onRate: (n: number) => void;
  suffix?: string;
  last?: boolean;
}) {
  return (
    <Row last={last}>
      <div className="flex min-w-0 items-center gap-3">
        <IosSwitch checked={checked} onChange={onToggle} label={label} />
        <span className="text-[15px] text-ink">{label}</span>
      </div>
      {checked ? (
        <MoneyField value={value} onChange={onRate} suffix={suffix} />
      ) : (
        <span className="text-[13px] text-[#8e8e93]">Off</span>
      )}
    </Row>
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
    <div className="space-y-5">
      <MaterialRows
        materials={value.materials}
        onChange={(materials) => onChange({ ...value, materials })}
      />

      <Group title="Job extras">
        <Row>
          <span className="text-[15px] text-ink">Strip-off</span>
          <MoneyField
            value={value.stripOffPerM2}
            onChange={(stripOffPerM2) =>
              onChange({ ...value, stripOffPerM2 })
            }
            suffix="/m²"
          />
        </Row>
        <ToggleMoneyRow
          checked={value.includeSkip}
          onToggle={(includeSkip) => onChange({ ...value, includeSkip })}
          label="Skip hire"
          value={value.skipHireExVat}
          onRate={(skipHireExVat) => onChange({ ...value, skipHireExVat })}
        />
        <ToggleMoneyRow
          checked={value.includeGutters}
          onToggle={(includeGutters) =>
            onChange({ ...value, includeGutters })
          }
          label="Gutters"
          value={value.gutterPerMExVat}
          onRate={(gutterPerMExVat) =>
            onChange({ ...value, gutterPerMExVat })
          }
          suffix="/m"
        />
        <ToggleMoneyRow
          checked={value.includeChimneyAllowance}
          onToggle={(includeChimneyAllowance) =>
            onChange({ ...value, includeChimneyAllowance })
          }
          label="Chimney flashing"
          value={value.chimneyAllowanceExVat}
          onRate={(chimneyAllowanceExVat) =>
            onChange({ ...value, chimneyAllowanceExVat })
          }
          suffix="/each"
          last
        />
      </Group>

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
    <div className="space-y-5">
      <MaterialRows
        materials={value.materials}
        onChange={(materials) => onChange({ ...value, materials })}
      />
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
    <div className="space-y-5">
      <Group title="Linear rates">
        <Row>
          <span className="text-[15px] text-ink">Gutters</span>
          <MoneyField
            value={value.gutterPerMExVat}
            onChange={(gutterPerMExVat) =>
              onChange({ ...value, gutterPerMExVat })
            }
            suffix="/m"
          />
        </Row>
        <Row last>
          <span className="text-[15px] text-ink">Fascias & soffits</span>
          <MoneyField
            value={value.fasciaSoffitPerMExVat}
            onChange={(fasciaSoffitPerMExVat) =>
              onChange({ ...value, fasciaSoffitPerMExVat })
            }
            suffix="/m"
          />
        </Row>
      </Group>
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
  const [openService, setOpenService] =
    useState<ServiceKey>("full_replacement");
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
      message: "Saved — their bubble uses these rates.",
      tone: "ok",
    });
    onSaved?.();
  };

  const openMeta = SERVICE_CATALOG.find((s) => s.key === openService)!;
  const openEnabled = config.enabledServices.includes(openService);

  return (
    <div
      className="rounded-[20px] px-1 py-1 sm:px-2 sm:py-2"
      style={{
        background:
          "linear-gradient(180deg, #f5f5f7 0%, #eef0f4 100%)",
      }}
    >
      <div className="space-y-5 p-3 sm:p-4">
        {/* Header — quiet, like iOS Settings nav */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8e8e93]">
              Setup
            </p>
            <h2 className="mt-0.5 text-[22px] font-semibold tracking-tight text-ink">
              Bubble pricing
            </h2>
            <p className="mt-1 max-w-md text-[14px] leading-snug text-[#636366]">
              Turn on what they offer, then set rates for the service you’re
              looking at.
            </p>
          </div>
          <ProgressPill
            complete={completeness.completePriced}
            total={completeness.enabledPriced}
          />
        </div>

        {!completeness.ready && completeness.warnings.length > 0 ? (
          <div className="rounded-[12px] bg-[#fff8e8] px-3.5 py-2.5 text-[13px] text-[#8a5a00] ring-1 ring-[#f0d48a]/80">
            {completeness.warnings.slice(0, 2).join(" · ")}
          </div>
        ) : null}

        {/* Split: service list + detail — same structure as before */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-5">
          <aside>
            <p className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.04em] text-[#8e8e93]">
              Services
            </p>
            <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06]">
              {SERVICE_CATALOG.map((s, idx) => {
                const enabled = config.enabledServices.includes(s.key);
                const active = openService === s.key;
                const last = idx === SERVICE_CATALOG.length - 1;
                return (
                  <div
                    key={s.key}
                    className={[
                      "flex items-center gap-2 px-3 py-2.5",
                      last ? "" : "border-b border-black/[0.06]",
                      active ? "bg-[#eef4ff]" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenService(s.key)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={[
                          "block truncate text-[15px] font-medium",
                          active ? "text-brand-700" : "text-ink",
                        ].join(" ")}
                      >
                        {s.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-[#8e8e93]">
                        {s.priced ? s.description : "Callback only"}
                      </span>
                    </button>
                    <IosSwitch
                      checked={enabled}
                      label={`${enabled ? "Disable" : "Enable"} ${s.label}`}
                      onChange={() => toggleService(s.key)}
                    />
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={openService}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <h3 className="truncate text-[17px] font-semibold tracking-tight text-ink">
                      {openMeta.label}
                    </h3>
                    <p className="text-[13px] text-[#8e8e93]">
                      {openEnabled
                        ? openMeta.priced
                          ? "Rates for this service only"
                          : "No rates — callback lead"
                        : "Off for this bubble"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              {!openEnabled ? (
                <button
                  type="button"
                  onClick={() => toggleService(openService)}
                  className="shrink-0 rounded-full bg-brand-600 px-3.5 py-1.5 text-[13px] font-semibold text-white"
                >
                  Turn on
                </button>
              ) : null}
            </div>

            {!openEnabled ? (
              <Group>
                <div className="px-4 py-8 text-center text-[14px] text-[#8e8e93]">
                  This job won’t appear until you turn it on.
                </div>
              </Group>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={openService}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
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
                  {!openMeta.priced ? (
                    <Group footer="Homeowners leave details; you call back. No instant estimate.">
                      <div className="px-4 py-5 text-[14px] text-[#636366]">
                        Callback-only — nothing to price here.
                      </div>
                    </Group>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Company options — Settings-style group */}
        <Group title="Company">
          <Row>
            <div>
              <p className="text-[15px] text-ink">VAT registered</p>
              <p className="text-[12px] text-[#8e8e93]">Quotes shown ex VAT</p>
            </div>
            <IosSwitch
              checked={config.vatRegistered}
              label="VAT registered"
              onChange={(vatRegistered) =>
                setConfig((c) => ({ ...c, vatRegistered }))
              }
            />
          </Row>
          <Row last={!showOrigins}>
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-[15px] text-ink">Quote range width</p>
              <p className="text-[12px] text-[#8e8e93]">
                Optional · e.g. 0.12 = ±12%
              </p>
            </div>
            <input
              type="text"
              inputMode="decimal"
              className="h-9 w-[5.5rem] rounded-[10px] bg-black/[0.04] px-2.5 text-right text-[15px] tabular-nums text-ink outline-none"
              placeholder="Auto"
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
          </Row>
          {showOrigins ? (
            <div className="border-t border-black/[0.06] px-4 py-3">
              <p className="text-[15px] text-ink">Allowed embed sites</p>
              <p className="mb-2 text-[12px] text-[#8e8e93]">
                One per line · blank = anywhere
              </p>
              <textarea
                rows={2}
                className="w-full rounded-[10px] bg-black/[0.04] px-3 py-2 text-[14px] text-ink outline-none"
                placeholder="https://ridgewayroofing.co.uk"
                value={originsText}
                onChange={(e) => setOriginsText(e.target.value)}
              />
            </div>
          ) : null}
        </Group>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-full bg-brand-600 px-6 py-2.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(31,87,240,0.65)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
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
