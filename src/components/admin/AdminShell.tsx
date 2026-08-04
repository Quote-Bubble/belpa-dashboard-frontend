"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { createClient } from "@/lib/supabase/client";
import CloudsBackground from "@/components/CloudsBackground";

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

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: (path: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Roofers",
    icon: (
      <svg {...iconProps} aria-hidden>
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    ),
    isActive: (p) => p === "/admin" || /^\/admin\/[^/]+$/.test(p),
  },
  {
    href: "/admin/account",
    label: "Account",
    icon: (
      <svg {...iconProps} aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </svg>
    ),
    isActive: (p) => p === "/admin/account",
  },
];

function AdminNav({
  email,
  rooferCount,
  onNavigate,
}: {
  email: string | null;
  rooferCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
      router.push("/login");
      router.refresh();
    } catch {
      /* leave them here to retry */
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="font-display px-2 text-2xl font-semibold tracking-tight text-ink"
      >
        Belpa
      </Link>
      <p className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white ml-2">
        Admin
      </p>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.isActive(pathname);
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
                  layoutId="admin-nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-brand-50"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <span className={active ? "text-brand-600" : "text-muted"}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin" ? (
                <span
                  className={[
                    "min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums leading-none",
                    active
                      ? "bg-brand-600 text-white"
                      : "bg-black/[0.06] text-ink-soft",
                  ].join(" ")}
                  aria-label={`${rooferCount} roofers`}
                >
                  {rooferCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          href="/quotes"
          onClick={onNavigate}
          className="group mb-2 flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 text-brand-800 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/70 text-brand-600">
            <svg {...iconProps} width={17} height={17} aria-hidden>
              <path d="M3 10.5 12 4l9 6.5" />
              <path d="M5 9.5V20h14V9.5" />
              <path d="M9.5 20v-5h5v5" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">
              Roofer dashboard
            </span>
            <span className="block text-[11px] leading-tight text-brand-700/60">
              Leads &amp; jobs view
            </span>
          </span>
          <span className="text-brand-500 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
        <div className="surface flex items-center gap-3 rounded-xl p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-ink to-black text-sm font-semibold text-white">
            {email?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Operator</p>
            <p className="truncate text-xs text-muted">{email ?? ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-0.5 w-full rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-black/[0.03] hover:text-ink disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

export default function AdminShell({
  children,
  email,
  rooferCount,
}: {
  children: React.ReactNode;
  email: string | null;
  rooferCount: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-dvh">
      <CloudsBackground />
      <div className="dot-grid pointer-events-none fixed inset-0 -z-10" />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 100% at 85% 0%, rgba(79,139,255,0.12), transparent 70%)",
        }}
      />

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
        <span className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold text-ink">
            Belpa
          </span>
          <span className="rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
            Admin
          </span>
        </span>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-ink"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <div key="drawer" className="fixed inset-0 z-40 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            <motion.div
              className="surface absolute inset-y-0 left-0 w-72 max-w-[80%]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <AdminNav
                email={email}
                rooferCount={rooferCount}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-white/50 bg-[#fafafb]/45 [backdrop-filter:blur(44px)_saturate(1.6)] md:block">
          <AdminNav email={email} rooferCount={rooferCount} />
        </aside>
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 xl:px-10">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
