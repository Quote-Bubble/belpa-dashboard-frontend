import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";

/** Operator-only. Non-admins are bounced back to their own dashboard. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/quotes");
  return <>{children}</>;
}
