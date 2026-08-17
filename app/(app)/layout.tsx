import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { requirePageMembership } from "@/lib/server/page-session";

export const dynamic = "force-dynamic";

export default async function AppShell({ children }: { children: ReactNode }) {
  const { membership } = await requirePageMembership();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav householdName={membership.household.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
