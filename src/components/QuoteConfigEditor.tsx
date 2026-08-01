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
  { value: "fixed_access", label: "Fixed £" },
  { value: "mewp_day", label: "MEWP" },
  { value: "tower", label: "Tower" },
  { value: "none", label: "None" },
];

function MoneyInput({
  value,
  onChange,
  suffix,
  disabled,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <label
      className={[
        "inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-2.5",
        disabled ? "opacity-40" : "focus-within:border-brand-400",
        className,
      ].join(" ")}
    >
      <span className="text-xs text-muted">£</span>
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
        className="w-full min-w-0 bg-transparent text-sm font-medium tabular-nums text-ink outline-none"
      />
      {suffix ? (
        <span className="shrink-0 text-[11px] text-muted">{suffix}</span>
      ) : null}
    </label>
  );
}

function TinySwitch({
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
      onClick={() => onChange(!checked)}
      className={[
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-brand-600" : "bg-black/[0.12]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="inline-flex flex-wrap rounded-lg border border-line bg-black/[0.02] p-0.5"
        role="radiogroup"
        aria-label="Access"
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
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
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
        <MoneyInput
          className="w-[140px]"
          value={value.rateExVat}
          onChange={(n) => onChange({ ...value, rateExVat: n })}
          suffix={value.mode === "scaffold_weeks" ? "/wk" : ""}
        />
      ) : (
        <span className="text-xs text-muted">No access line on quotes</span>
      )}
    </div>
  );
}

function MaterialTable({
  materials,
  onChange,
}: {
  materials: ReplacementServiceConfig["materials"];
  onChange: (m: ReplacementServiceConfig["materials"]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-black/[0.02] text-[11px] font-medium uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-medium">Material</th>
            <th className="w-16 px-2 py-2 text-center font-medium">Offer</th>
            <th className="w-36 px-3 py-2 text-right font-medium">£ / m²</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => (
            <tr
              key={m.key}
              className={[
                i > 0 ? "border-t border-line" : "",
                m.enabled ? "" : "text-muted",
              ].join(" ")}
            >
              <td className="px-3 py-2 font-medium text-ink">{m.label}</td>
              <td className="px-2 py-2 text-center">
                <div className="flex justify-center">
                  <TinySwitch
                    checked={m.enabled}
                    label={`${m.enabled ? "Disable" : "Enable"} ${m.label}`}
                    onChange={(enabled) => {
                      onChange(
                        materials.map((x, j) =>
                          j === i ? { ...x, enabled } : x,
                        ),
                      );
                    }}
                  />
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end">
                  <MoneyInput
                    className="w-[7.5rem]"
                    value={m.rateExVat}
                    disabled={!m.enabled}
                    onChange={(rateExVat) => {
                      onChange(
                        materials.map((x, j) =>
                          j === i ? { ...x, rateExVat } : x,
                        ),
                      );
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExtraRow({
  checked,
  onToggle,
  label,
  value,
  onRate,
  suffix,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  value: number;
  onRate: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label className="flex min-w-0 cursor-pointer items-center gap-2.5">
        <TinySwitch checked={checked} onChange={onToggle} label={label} />
        <span className="text-sm text-ink">{label}</span>
      </label>
      {checked ? (
        <MoneyInput
          className="w-[7.5rem]"
          value={value}
          onChange={onRate}
          suffix={suffix}
        />
      ) : (
        <span className="text-xs text-muted">Off</span>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium text-muted">{children}</p>
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
      <div>
        <FieldLabel>Coverings</FieldLabel>
        <MaterialTable
          materials={value.materials}
          onChange={(materials) => onChange({ ...value, materials })}
        />
      </div>

      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Strip-off</FieldLabel>
          <MoneyInput
            className="w-full max-w-[10rem]"
            value={value.stripOffPerM2}
            onChange={(stripOffPerM2) =>
              onChange({ ...value, stripOffPerM2 })
            }
            suffix="/m²"
          />
        </div>
        <div className="space-y-0.5">
          <ExtraRow
            checked={value.includeSkip}
            onToggle={(includeSkip) => onChange({ ...value, includeSkip })}
            label="Skip hire"
            value={value.skipHireExVat}
            onRate={(skipHireExVat) => onChange({ ...value, skipHireExVat })}
          />
          <ExtraRow
            checked={value.includeGutters}
            onToggle={(includeGutters) =>
              onChange({ ...value, includeGutters })
            }
            label="Gutters (when measured)"
            value={value.gutterPerMExVat}
            onRate={(gutterPerMExVat) =>
              onChange({ ...value, gutterPerMExVat })
            }
            suffix="/m"
          />
          <ExtraRow
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
          />
        </div>
      </div>

      <div>
        <FieldLabel>Access</FieldLabel>
        <AccessEditor
          value={value.access}
          onChange={(access) => onChange({ ...value, access })}
        />
      </div>
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
      <div>
        <FieldLabel>Coverings</FieldLabel>
        <MaterialTable
          materials={value.materials}
          onChange={(materials) => onChange({ ...value, materials })}
        />
      </div>
      <div>
        <FieldLabel>Access</FieldLabel>
        <AccessEditor
          value={value.access}
          onChange={(access) => onChange({ ...value, access })}
        />
      </div>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Gutters</FieldLabel>
          <MoneyInput
            className="w-full max-w-[12rem]"
            value={value.gutterPerMExVat}
            onChange={(gutterPerMExVat) =>
              onChange({ ...value, gutterPerMExVat })
            }
            suffix="/m"
          />
        </div>
        <div>
          <FieldLabel>Fascias & soffits</FieldLabel>
          <MoneyInput
            className="w-full max-w-[12rem]"
            value={value.fasciaSoffitPerMExVat}
            onChange={(fasciaSoffitPerMExVat) =>
              onChange({ ...value, fasciaSoffitPerMExVat })
            }
            suffix="/m"
          />
        </div>
      </div>
      <div>
        <FieldLabel>Access</FieldLabel>
        <AccessEditor
          value={value.access}
          onChange={(access) => onChange({ ...value, access })}
        />
      </div>
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
  const [showMore, setShowMore] = useState(false);
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
  const status =
    completeness.enabledPriced === 0
      ? "Turn on at least one priced service"
      : completeness.ready
        ? `${completeness.completePriced} services priced`
        : `${completeness.completePriced}/${completeness.enabledPriced} priced`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Pricing</h2>
          <p className="mt-0.5 text-sm text-muted">
            Choose services, then set rates for the one you&apos;re on.
          </p>
        </div>
        <p
          className={[
            "text-xs font-medium",
            completeness.ready ? "text-emerald-700" : "text-muted",
          ].join(" ")}
        >
          {status}
        </p>
      </div>

      {!completeness.ready && completeness.warnings.length > 0 ? (
        <p className="text-xs text-amber-800">
          Still needed: {completeness.warnings.slice(0, 2).join(" · ")}
        </p>
      ) : null}

      {/* Service picker — compact chips */}
      <div className="flex flex-wrap gap-1.5">
        {SERVICE_CATALOG.map((s) => {
          const enabled = config.enabledServices.includes(s.key);
          const active = openService === s.key;
          return (
            <div
              key={s.key}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1",
                active
                  ? "border-brand-500 bg-brand-50 text-ink"
                  : "border-line bg-white text-ink-soft hover:border-ink/20",
                !enabled && !active ? "opacity-55" : "",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setOpenService(s.key)}
                className="text-left text-sm font-medium"
              >
                {s.label}
              </button>
              <TinySwitch
                checked={enabled}
                label={`${enabled ? "Disable" : "Enable"} ${s.label}`}
                onChange={() => toggleService(s.key)}
              />
            </div>
          );
        })}
      </div>

      {/* Active service body */}
      <div className="rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink">
              {openMeta.label}
            </h3>
            {!openMeta.priced ? (
              <p className="text-xs text-muted">Callback only — no rates</p>
            ) : null}
          </div>
          {!openEnabled ? (
            <button
              type="button"
              onClick={() => toggleService(openService)}
              className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Turn on
            </button>
          ) : null}
        </div>

        <div className="px-4 py-4">
          {!openEnabled ? (
            <p className="text-sm text-muted">
              Off — won&apos;t show in their bubble.
            </p>
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
                        services: { ...c.services, flat_roof_replacement },
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
                        services: { ...c.services, tile_or_slate_repair },
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
                        services: { ...c.services, gutters_fascias_soffits },
                      }))
                    }
                  />
                )}
              {!openMeta.priced ? (
                <p className="text-sm text-muted">
                  Homeowners who pick this leave details for a call-back. No
                  instant estimate.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Footer: save + collapsed company options */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-xs font-medium text-muted hover:text-ink"
          >
            {showMore ? "Hide company options" : "Company options"}
          </button>
          {showMore ? (
            <div className="mt-3 max-w-lg space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">VAT registered</span>
                <TinySwitch
                  checked={config.vatRegistered}
                  label="VAT registered"
                  onChange={(vatRegistered) =>
                    setConfig((c) => ({ ...c, vatRegistered }))
                  }
                />
              </label>
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Quote range width (optional, e.g. 0.12 = ±12%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="field h-9 w-full max-w-[12rem] rounded-lg px-2.5 text-sm outline-none"
                  placeholder="Default"
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
              {showOrigins ? (
                <div>
                  <label className="mb-1 block text-xs text-muted">
                    Allowed embed sites (one per line; blank = anywhere)
                  </label>
                  <textarea
                    rows={2}
                    className="field w-full rounded-lg px-2.5 py-2 text-sm outline-none"
                    placeholder="https://ridgewayroofing.co.uk"
                    value={originsText}
                    onChange={(e) => setOriginsText(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="btn-primary shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
