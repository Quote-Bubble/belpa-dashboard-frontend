"use client";

import { useState } from "react";

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: "How does Belpa calculate a quote?",
    a: "When a homeowner enters their address on your website, Belpa measures the roof from satellite imagery and applies the material, labour and access prices you set on the Account page. The estimate that lands here is the range they saw.",
  },
  {
    q: "Can I change my prices?",
    a: "Yes — on the Account page, pick the services your bubble should offer and set the rates for each one (coverings, access, skip, gutters, and so on). Homeowners only see what you enable, priced with your numbers.",
  },
  {
    q: "What does the access rating mean?",
    a: "It reflects how hard the roof is to work on — pitch, number of roof planes and property type. Difficult roofs usually need more scaffolding and time, so it's a flag to price carefully before you commit.",
  },
  {
    q: "How do I add Belpa to my website?",
    a: "We give you a single snippet to paste into your site — or send it to whoever manages it. Once it's in, the quote bubble appears and leads start arriving here. Contact us and we'll walk you through it.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="surface divide-y divide-line overflow-hidden rounded-2xl">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
            >
              <span className="text-sm font-medium text-ink">{faq.q}</span>
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[
                  "shrink-0 text-muted transition-transform duration-200",
                  isOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">
                {faq.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
