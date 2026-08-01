"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Method = "button" | "widget" | "link";

const HINTS: Record<Method, string> = {
  button: "Opens the quote flow fullscreen from a button.",
  widget: "Embeds the quote flow inline on the page.",
  link: "Hosted page — WhatsApp, GBP, or QR. No website needed.",
};

const TABS: { value: Method; label: string }[] = [
  { value: "button", label: "Button" },
  { value: "widget", label: "Inline" },
  { value: "link", label: "Link" },
];

export default function InstallSnippets({
  slug,
  button,
  widget,
  link,
  preview,
}: {
  slug: string;
  button: string;
  widget: string;
  link: string;
  /** Where "Preview ↗" opens per tab — a mock roofer site for button/inline,
   *  the hosted page for link. */
  preview: { button: string; widget: string; link: string };
}) {
  const [tab, setTab] = useState<Method>("button");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

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

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `quoter-${slug}-qr.png`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full rounded-full border border-line bg-white p-0.5 sm:inline-flex sm:w-auto">
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={[
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none",
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
        <div className="flex gap-2">
          <a
            href={
              tab === "button"
                ? preview.button
                : tab === "widget"
                  ? preview.widget
                  : preview.link
            }
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost flex-1 rounded-full px-3 py-1.5 text-center text-xs font-semibold sm:flex-none"
          >
            {tab === "link" ? "Open ↗" : "Preview ↗"}
          </a>
          <button
            type="button"
            onClick={copy}
            className="btn-primary flex-1 rounded-full px-3.5 py-1.5 text-xs font-semibold sm:flex-none"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">{HINTS[tab]}</p>

      <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0f172a] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#e2e8f0]">
        <code>{code}</code>
      </pre>

      {tab === "link" && (
        <div
          ref={qrRef}
          className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-white p-3"
        >
          <QRCodeCanvas
            value={link}
            size={320}
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#0a0b0d"
            level="M"
            className="h-20 w-20 shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">QR code</p>
            <button
              type="button"
              onClick={downloadQr}
              className="mt-1.5 btn-ghost rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
