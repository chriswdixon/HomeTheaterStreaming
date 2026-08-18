import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { BackToTopButton } from "@/components/back-to-top-button";
import { requirePageMembership } from "@/lib/server/page-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AppShell({ children }: { children: ReactNode }) {
  const { membership } = await requirePageMembership();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        household={{
          name: membership.household.name,
          inviteCode: membership.household.inviteCode,
          region: membership.household.region,
        }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <BackToTopButton />
    </div>
  );
}
