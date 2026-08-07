"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import InstallSnippets from "@/components/admin/InstallSnippets";
import AllowedDomains from "@/components/admin/AllowedDomains";
import Toast from "@/components/Toast";
import type { ActionResult } from "@/lib/action-result";
import { unlinkRooferLogin } from "@/lib/admin-actions";

const field =
  "field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted";
const label = "mb-1.5 block text-xs font-medium text-ink-soft";

type Tab = "details" | "install" | "access";

type Props = {
  rooferId: string;
  install: {
    slug: string;
    button: string;
    widget: string;
    link: string;
    preview: { button: string; widget: string; link: string };
    allowedOrigins: string[];
  };
  details: {
    name: string;
    website: string;
    contactName: string;
    contactPhone: string;
  };
  members: { email: string }[];
  updateAction: (formData: FormData) => Promise<ActionResult>;
  linkAction: (formData: FormData) => Promise<ActionResult>;
};

/**
 * Setup panel: profile, install snippets, logins.
 * Pricing lives on its own hub tab as a full page.
 */
export default function RooferPanel({
  rooferId,
  install,
  details,
  members,
  updateAction,
  linkAction,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("details");
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "error";
  } | null>(null);
  const [unlinking, startUnlink] = useTransition();

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "install", label: "Install" },
    {
      id: "access",
      label: members.length ? `Access · ${members.length}` : "Access",
    },
  ];

  const showResult = (result: ActionResult) => {
    if (result.ok) {
      setToast({ message: result.message ?? "Done.", tone: "ok" });
      router.refresh();
    } else {
      setToast({ message: result.error, tone: "error" });
    }
  };

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
          <form
            action={async (fd) => showResult(await updateAction(fd))}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className={label} htmlFor="name">
                Company
              </label>
              <input
                id="name"
                name="name"
                defaultValue={details.name}
                className={field}
                required
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
                className={field}
                placeholder="https://"
              />
            </div>
            <div>
              <label className={label} htmlFor="contact_name">
                Contact name
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
                Contact phone
              </label>
              <input
                id="contact_phone"
                name="contact_phone"
                defaultValue={details.contactPhone}
                className={field}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end pt-1">
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
          <>
            <InstallSnippets
              slug={install.slug}
              button={install.button}
              widget={install.widget}
              link={install.link}
              preview={install.preview}
            />
            {/* Directly under the snippet on purpose: handing over the embed
                and locking it to their domain are one job, done in one sitting,
                and splitting them is how the second half gets forgotten. */}
            <AllowedDomains
              rooferId={rooferId}
              initial={install.allowedOrigins}
              website={details.website}
            />
          </>
        )}

        {tab === "access" && (
          <div className="space-y-3">
            {members.length > 0 ? (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li
                    key={m.email}
                    className="flex items-center justify-between gap-3 rounded-xl bg-brand-50/80 px-3 py-2"
                  >
                    <span className="truncate text-xs font-medium text-brand-700">
                      {m.email}
                    </span>
                    <button
                      type="button"
                      disabled={unlinking}
                      onClick={() =>
                        startUnlink(async () => {
                          showResult(
                            await unlinkRooferLogin(rooferId, m.email),
                          );
                        })
                      }
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      Unlink
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No logins linked yet.</p>
            )}
            <form
              action={async (fd) => showResult(await linkAction(fd))}
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
            <p className="text-xs text-muted">
              They must create an account first. Then link their signup email
              here.
            </p>
          </div>
        )}
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDone={() => setToast(null)}
      />
    </section>
  );
}
