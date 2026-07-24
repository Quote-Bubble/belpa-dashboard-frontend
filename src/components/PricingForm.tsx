"use client";

import { useState } from "react";

import type { PricingProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

function parseMoney(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function MoneyInput({
  value,
  onCommit,
  suffix,
}: {
  value: number;
  onCommit: (n: number) => void;
  suffix?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    const n = parseMoney(raw);
    if (n == null) {
      setInvalid(true);
      setRaw(String(value));
      return;
    }
    setInvalid(false);
    setRaw(String(n));
    if (n !== value) onCommit(n);
  };

  return (
    <div
      className={[
        "field flex items-center gap-1 px-3 py-2",
        invalid ? "ring-1 ring-red-400" : "",
      ].join(" ")}
    >
      <span className="text-sm text-muted">£</span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full bg-transparent text-sm font-medium tabular-nums text-ink outline-none"
      />
      {suffix && <span className="whitespace-nowrap text-xs text-muted">{suffix}</span>}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-2xl p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function PricingForm({
  rooferId,
  initial,
  onSaved,
}: {
  rooferId: string;
  initial: PricingProfile;
  onSaved: () => void;
}) {
  const [profile, setProfile] = useState<PricingProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<PricingProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const updateMaterial = (key: string, rate: number) => {
    update({
      materials: profile.materials.map((m) =>
        m.key === key ? { ...m, rate } : m,
      ),
    });
  };

  const handleSave = async () => {
    // Reject negative / non-finite before hitting the DB CHECK constraints.
    const numbers = [
      profile.labourPerDay,
      profile.minimumCallout,
      profile.skipHire,
      profile.scaffoldPerWeek,
      ...profile.materials.map((m) => m.rate),
    ];
    if (numbers.some((n) => !Number.isFinite(n) || n < 0)) {
      setError("All rates must be zero or positive numbers.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: saveError } = await createClient()
      .from("roofer_pricing")
      .upsert(
        {
          roofer_id: rooferId,
          materials: profile.materials,
          labour_per_day: profile.labourPerDay,
          minimum_callout: profile.minimumCallout,
          skip_hire: profile.skipHire,
          scaffold_per_week: profile.scaffoldPerWeek,
          vat_registered: profile.vatRegistered,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roofer_id" },
      );

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return; // stay dirty so the roofer can retry
    }
    setDirty(false);
    onSaved();
  };

  return (
    <div className="space-y-5">
      <Section
        title="Materials"
        description="Your supply-and-fit rate per square metre for each roof covering."
      >
        <div className="divide-y divide-line">
          {profile.materials.map((m) => (
            <div
              key={m.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="text-sm font-medium text-ink">{m.label}</span>
              <div className="w-40">
                <MoneyInput
                  value={m.rate}
                  onCommit={(n) => updateMaterial(m.key, n)}
                  suffix="/m²"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="Labour" description="Day rate per roofer on site.">
          <MoneyInput
            value={profile.labourPerDay}
            onCommit={(n) => update({ labourPerDay: n })}
            suffix="/ day"
          />
        </Section>

        <Section title="Minimum callout" description="Floor price for small jobs.">
          <MoneyInput
            value={profile.minimumCallout}
            onCommit={(n) => update({ minimumCallout: n })}
          />
        </Section>

        <Section title="Skip hire" description="Typical waste removal per job.">
          <MoneyInput
            value={profile.skipHire}
            onCommit={(n) => update({ skipHire: n })}
          />
        </Section>

        <Section title="Scaffold" description="Hire cost per week.">
          <MoneyInput
            value={profile.scaffoldPerWeek}
            onCommit={(n) => update({ scaffoldPerWeek: n })}
            suffix="/ week"
          />
        </Section>
      </div>

      <Section title="VAT" description="Applied on top of the ex-VAT estimates.">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={profile.vatRegistered}
            onChange={(e) => update({ vatRegistered: e.target.checked })}
            className="h-4 w-4 accent-brand-500"
          />
          <span className="text-sm text-ink">
            VAT registered (add 20% to customer-facing quotes)
          </span>
        </label>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {error ? (
          <span className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
            Couldn’t save: {error}
          </span>
        ) : (
          dirty && <span className="text-sm text-muted">Unsaved changes</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
