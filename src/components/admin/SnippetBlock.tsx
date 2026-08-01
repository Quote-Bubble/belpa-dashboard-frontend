"use client";

import { useState } from "react";

export default function SnippetBlock({
  title,
  hint,
  code,
}: {
  title: string;
  hint?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the code is selectable in the block below */
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn-ghost shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-[#0f172a] px-4 py-3 text-[12.5px] leading-relaxed text-[#e2e8f0]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
