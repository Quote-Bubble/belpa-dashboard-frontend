"use client";

import { useState } from "react";

type Method = "button" | "widget" | "link";

const HINTS: Record<Method, string> = {
  button: "A button anywhere on their site opens the quote flow fullscreen.",
  widget: "Drops the quote flow into the page, already expanded.",
  link: "Share over WhatsApp, in a Google Business Profile, or as a QR — no website needed.",
};

const TABS: { value: Method; label: string }[] = [
  { value: "button", label: "Button" },
  { value: "widget", label: "Inline" },
  { value: "link", label: "Link" },
];

export default function InstallSnippets({
  button,
  widget,
  link,
}: {
  button: string;
  widget: string;
  link: string;
}) {
  const [tab, setTab] = useState<Method>("button");
  const [copied, setCopied] = useState(false);

  const code = tab === "button" ? button : tab === "widget" ? widget : link;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* selectable below */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line bg-white p-0.5">
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-brand-600 text-white"
                    : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            Preview ↗
          </a>
          <button
            type="button"
            onClick={copy}
            className="btn-primary rounded-full px-3.5 py-1.5 text-xs font-semibold"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-muted">{HINTS[tab]}</p>

      <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0f172a] px-4 py-3 text-[12.5px] leading-relaxed text-[#e2e8f0]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
