"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type { RooferProfile } from "@/lib/types";
import { DashboardModeProvider } from "@/components/DashboardModeProvider";
import Sidebar from "@/components/Sidebar";
import CloudsBackground from "@/components/CloudsBackground";

export default function DashboardShell({
  children,
  userEmail,
  roofer,
  isAdmin = false,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  roofer: RooferProfile | null;
  isAdmin?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardModeProvider>
      <div className="relative min-h-dvh">
        {/* Canvas backdrop: blurred landing clouds along the bottom, dot grid,
            soft brand wash in the top corner */}
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
          <span className="font-display text-xl font-semibold text-ink">
            Quoter
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

        {/* Mobile drawer */}
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
                <Sidebar
                  userEmail={userEmail}
                  roofer={roofer}
                  isAdmin={isAdmin}
                  onNavigate={() => setMobileOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-white/50 bg-[#fafafb]/45 [backdrop-filter:blur(44px)_saturate(1.6)] md:block">
            <Sidebar userEmail={userEmail} roofer={roofer} isAdmin={isAdmin} />
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 xl:px-10">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </DashboardModeProvider>
  );
}
