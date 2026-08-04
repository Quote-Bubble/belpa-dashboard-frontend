export type DashboardMode = "quotes" | "jobs";

export const DASHBOARD_MODE_KEY = "belpa.dashboardMode";

export function isDashboardMode(value: unknown): value is DashboardMode {
  return value === "quotes" || value === "jobs";
}

export function inboxPathForMode(mode: DashboardMode): "/quotes" | "/jobs" {
  return mode === "jobs" ? "/jobs" : "/quotes";
}

/** True when the path is the Quotes or Jobs inbox (not analytics/account). */
export function isInboxPath(pathname: string): boolean {
  return (
    pathname === "/quotes" ||
    pathname.startsWith("/quotes/") ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs/")
  );
}

export function modeFromPathname(pathname: string): DashboardMode | null {
  if (pathname === "/jobs" || pathname.startsWith("/jobs/")) return "jobs";
  if (pathname === "/quotes" || pathname.startsWith("/quotes/")) return "quotes";
  return null;
}
