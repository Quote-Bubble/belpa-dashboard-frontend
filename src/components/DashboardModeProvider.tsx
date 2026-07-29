"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  DASHBOARD_MODE_KEY,
  inboxPathForMode,
  isDashboardMode,
  isInboxPath,
  modeFromPathname,
  type DashboardMode,
} from "@/lib/dashboard-mode";

type DashboardModeContextValue = {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
};

const DashboardModeContext = createContext<DashboardModeContextValue | null>(
  null,
);

function readStoredMode(): DashboardMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_MODE_KEY);
    return isDashboardMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: DashboardMode) {
  try {
    window.localStorage.setItem(DASHBOARD_MODE_KEY, mode);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function DashboardModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mode, setModeState] = useState<DashboardMode>(
    () => modeFromPathname(pathname) ?? "quotes",
  );

  // Inbox routes own the mode; elsewhere restore the last choice.
  useEffect(() => {
    const fromPath = modeFromPathname(pathname);
    if (fromPath) {
      setModeState(fromPath);
      writeStoredMode(fromPath);
      return;
    }
    const stored = readStoredMode();
    if (stored) setModeState(stored);
  }, [pathname]);

  const setMode = useCallback(
    (next: DashboardMode) => {
      setModeState(next);
      writeStoredMode(next);
      if (isInboxPath(pathname)) {
        const target = inboxPathForMode(next);
        if (pathname !== target && !pathname.startsWith(`${target}/`)) {
          router.push(target);
        }
      }
    },
    [pathname, router],
  );

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <DashboardModeContext.Provider value={value}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode(): DashboardModeContextValue {
  const ctx = useContext(DashboardModeContext);
  if (!ctx) {
    throw new Error("useDashboardMode must be used within DashboardModeProvider");
  }
  return ctx;
}
