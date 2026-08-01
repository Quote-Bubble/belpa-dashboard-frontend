"use client";

import { useState } from "react";

import InstallSnippets from "@/components/admin/InstallSnippets";

const field =
  "field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted";
const label = "mb-1.5 block text-xs font-medium text-ink-soft";

type Tab = "details" | "install" | "access";

type Props = {
  install: {
    slug: string;
    button: string;
    widget: string;
    link: string;
    preview: { button: string; widget: string; link: string };
  };
  details: {
    name: string;
    website: string;
    contactName: string;
    contactPhone: string;
  };
  members: { email: string }[];
  updateAction: (formData: FormData) => void | Promise<void>;
  linkAction: (formData: FormData) => void | Promise<void>;
};

/**
 * Setup panel: profile, install snippets, logins.
 * Destructive actions live in the page-header ⋯ menu.
 */
export default function RooferPanel({
  install,
  details,
  members,
  updateAction,
  linkAction,
}: Props) {
  const [tab, setTab] = useState<Tab>("details");

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "install", label: "Install" },
    {
      id: "access",
      label: members.length ? `Access · ${members.length}` : "Access",
    },
  ];

  return (
    <section className="surface overflow-hidden rounded-2xl">
      <div className="flex gap-0.5 overflow-x-auto border-b border-line px-2 pt-1.5 sm:px-3">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "relative shrink-0 px-3 py-3 text-sm font-semibold transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-5">
        {tab === "details" && (
          <form action={updateAction} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="name">
                Company
              </label>
              <input
                id="name"
                name="name"
                defaultValue={details.name}
                className={field}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="website">
                Website
              </label>
              <input
                id="website"
                name="website"
                defaultValue={details.website}
                placeholder="https://…"
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="contact_name">
                Contact
              </label>
              <input
                id="contact_name"
                name="contact_name"
                defaultValue={details.contactName}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="contact_phone">
                Phone
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                defaultValue={details.contactPhone}
                className={field}
              />
            </div>
            <div className="flex justify-end pt-1 sm:col-span-2">
              <button
                type="submit"
                className="btn-primary rounded-full px-5 py-2 text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {tab === "install" && (
          <InstallSnippets
            slug={install.slug}
            button={install.button}
            widget={install.widget}
            link={install.link}
            preview={install.preview}
          />
        )}

        {tab === "access" && (
          <div className="space-y-3">
            {members.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <li
                    key={m.email}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                  >
                    {m.email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No logins linked yet.</p>
            )}
            <form
              action={linkAction}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="roofer@email.co.uk"
                className={`${field} sm:flex-1`}
              />
              <button
                type="submit"
                className="btn-primary shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold"
              >
                Link
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
