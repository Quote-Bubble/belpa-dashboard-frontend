"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";

import type { RooferProfile } from "@/lib/types";
import { inboxPathForMode } from "@/lib/dashboard-mode";
import { createClient } from "@/lib/supabase/client";
import { useDashboardMode } from "@/components/DashboardModeProvider";
import QuotesJobsSwitcher from "@/components/QuotesJobsSwitcher";
import NewLeadBadge from "@/components/NewLeadBadge";

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

const quotesIcon = (
  <svg {...iconProps} aria-hidden>
    <path d="M4 5h16M4 12h16M4 19h10" />
  </svg>
);

const jobsIcon = (
  <svg {...iconProps} aria-hidden>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0Z" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const REST_NAV: NavItem[] = [
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
  isAdmin = false,
}: {
  onNavigate?: () => void;
  userEmail?: string | null;
  roofer: RooferProfile | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useDashboardMode();
  const [signingOut, setSigningOut] = useState(false);

  const inbox: NavItem =
    mode === "jobs"
      ? { href: "/jobs", label: "Jobs", icon: jobsIcon }
      : { href: "/quotes", label: "Quotes", icon: quotesIcon };

  // /analytics is mode-aware (AnalyticsClient renders the Jobs lens when mode is
  // "jobs"), so keep the nav item in both modes.
  const nav = [inbox, ...REST_NAV];
  const homeHref = inboxPathForMode(mode);

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
      <Link href={homeHref} onClick={onNavigate} className="block px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/belpa-wordmark.png" alt="Belpa" className="h-7 w-auto" />
      </Link>
      <p className="mt-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
        Dashboard
      </p>

      {/* Mode switcher — scopes inbox + analytics */}
      <div className="mt-5 px-0.5">
        <QuotesJobsSwitcher onSelect={onNavigate} />
      </div>

      {/* Nav */}
      <nav className="mt-5 flex flex-col gap-1">
        {nav.map((item) => {
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
              {item.href === "/quotes" ? (
                <NewLeadBadge active={!!active} />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Roofer identity */}
      <div className="mt-auto">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="group mb-2 flex items-center gap-3 rounded-xl bg-ink px-3 py-2.5 text-white shadow-sm ring-1 ring-black/5 transition-colors hover:bg-black"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15">
              <svg {...iconProps} width={17} height={17} aria-hidden>
                <path d="M12 3 4 6v5c0 4.5 3.2 7.4 8 9 4.8-1.6 8-4.5 8-9V6l-8-3Z" />
                <path d="m9.2 12 2 2 3.6-3.8" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">
                Admin console
              </span>
              <span className="block text-[11px] leading-tight text-white/55">
                Manage roofers
              </span>
            </span>
            <span className="text-white/50 transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        )}
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
