"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";

import type { RooferProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NAV: NavItem[] = [
  {
    href: "/quotes",
    label: "Quotes",
    icon: (
      <svg {...iconProps} aria-hidden>
        <path d="M4 5h16M4 12h16M4 19h10" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg {...iconProps} aria-hidden>
        <path d="M4 19V5M4 19h16M8 19v-6M13 19V9M18 19v-9" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    icon: (
      <svg {...iconProps} aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </svg>
    ),
  },
  {
    href: "/support",
    label: "Support",
    icon: (
      <svg {...iconProps} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.3 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.7 2.2-2.7 4" />
        <path d="M12 17.5h.01" />
      </svg>
    ),
  },
];

export default function Sidebar({
  onNavigate,
  userEmail,
  roofer,
}: {
  onNavigate?: () => void;
  userEmail?: string | null;
  roofer: RooferProfile | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
      router.push("/login");
      router.refresh();
    } catch {
      // Leave the user on the page with the button re-enabled so they can retry.
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-4 py-6">
      {/* Wordmark */}
      <Link
        href="/quotes"
        onClick={onNavigate}
        className="font-display px-2 text-2xl font-semibold tracking-tight text-ink"
      >
        Quoter
      </Link>
      <p className="mt-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
        Dashboard
      </p>

      {/* Nav */}
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={[
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-brand-700"
                  : "text-ink-soft hover:bg-black/[0.03] hover:text-ink",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-brand-50"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <span
                className={
                  active
                    ? "text-brand-600 transition-colors"
                    : "text-muted transition-colors"
                }
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Roofer identity */}
      <div className="mt-auto">
        <div className="surface flex items-center gap-3 rounded-xl p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-sm font-semibold text-white">
            {roofer?.name.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {roofer?.name ?? "No roofer linked"}
            </p>
            <p className="truncate text-xs text-muted">{userEmail ?? ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-black/[0.03] hover:text-ink disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
