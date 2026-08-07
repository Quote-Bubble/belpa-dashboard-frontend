"use client";

import {
  ChartColumn,
  CircleHelp,
  CircleUser,
  ClipboardList,
  List,
  ShieldCheck,
} from "lucide-react";
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

// Lucide, at the weight this file already used. Hand-drawn paths were the
// reason nothing quite lined up across the app — see QuoteConfigEditor.
const ICON = { size: 20, strokeWidth: 1.9 } as const;

const quotesIcon = <List {...ICON} aria-hidden />;
const jobsIcon = <ClipboardList {...ICON} aria-hidden />;

const REST_NAV: NavItem[] = [
  {
    href: "/analytics",
    label: "Analytics",
    icon: <ChartColumn {...ICON} aria-hidden />,
  },
  {
    href: "/account",
    label: "Account",
    icon: <CircleUser {...ICON} aria-hidden />,
  },
  {
    href: "/support",
    label: "Support",
    icon: <CircleHelp {...ICON} aria-hidden />,
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
              <ShieldCheck size={17} strokeWidth={1.8} aria-hidden />
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
