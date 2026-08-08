"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeCanvas } from "qrcode.react";

import SegmentedControl from "@/components/SegmentedControl";
import { POPOVER_TRANSITION } from "@/lib/motion";

type Method = "button" | "widget" | "link";

/**
 * Field labels for the box below — what the thing is and, for the snippets,
 * where it goes. Not a description of the feature: whoever is reading this has
 * already picked the tab, and an operator running an install does not need the
 * option sold to them again.
 */
const LABELS: Record<Method, string> = {
  button: "Paste where the button should appear",
  widget: "Paste where the quote form should appear",
  link: "Quote link",
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
  // Link-first distribution: every roofer can share immediately; website
  // embeds are the upsell once they have a site / designer.
  const [tab, setTab] = useState<Method>("link");
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
    a.download = `belpa-${slug}-qr.png`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={setTab}
          layoutId="install-tab-pill"
          fullWidth
          ariaLabel="Install method"
        />
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

      {/* mode="wait" so the outgoing snippet clears before the new one
          arrives. Without it the two overlap mid-fade and you briefly read
          two different code blocks stacked on each other, which on a dark
          block is genuinely unreadable rather than merely busy. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={POPOVER_TRANSITION}
        >
          <p className="mt-4 mb-1.5 text-xs font-medium text-ink-soft">
            {LABELS[tab]}
          </p>

          <pre className="overflow-x-auto rounded-xl bg-[#0f172a] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#e2e8f0]">
            <code>{code}</code>
          </pre>
        </motion.div>
      </AnimatePresence>

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
