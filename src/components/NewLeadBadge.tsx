"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "quoter:last-seen-new-leads";

/**
 * Polls for unseen "new" quote requests and shows a nav badge.
 * Lead email already goes out from the API; this is the in-app signal.
 */
export default function NewLeadBadge({ active }: { active: boolean }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const poll = async () => {
      const since =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;

      let query = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "new")
        .eq("archived", false)
        .in("intent", ["quote_requested", "callback_requested"]);

      if (since) {
        query = query.gt("received_at", since);
      }

      const { count: next } = await query;
      if (!cancelled) setCount(next ?? 0);
    };

    void poll();
    const id = window.setInterval(() => void poll(), 45_000);

    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  // Visiting Quotes clears the badge by advancing the watermark.
  useEffect(() => {
    if (pathname !== "/quotes" && !pathname.startsWith("/quotes/")) return;
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setCount(0);
  }, [pathname]);

  if (count <= 0) return null;

  return (
    <span
      className={[
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
        active
          ? "bg-brand-600 text-white"
          : "bg-brand-100 text-brand-700",
      ].join(" ")}
      aria-label={`${count} new lead${count === 1 ? "" : "s"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
