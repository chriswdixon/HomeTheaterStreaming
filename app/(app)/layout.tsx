import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { BackToTopButton } from "@/components/back-to-top-button";
import {
  countUnreadNotifications,
  loadNotifications,
} from "@/lib/server/notifications";
import { requirePageMembership } from "@/lib/server/page-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AppShell({ children }: { children: ReactNode }) {
  const { userId, membership, memberships } = await requirePageMembership();
  const [initialNotifications, initialUnreadCount] = await Promise.all([
    loadNotifications(userId),
    countUnreadNotifications(userId),
  ]);

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col overflow-x-clip">
      <AppNav
        household={{
          name: membership.household.name,
          inviteCode: membership.household.inviteCode,
          region: membership.household.region,
        }}
        households={memberships.map((row) => ({
          id: row.householdId,
          name: row.household.name,
          role: row.role,
        }))}
        activeHouseholdId={membership.householdId}
        initialNotifications={initialNotifications}
        initialUnreadCount={initialUnreadCount}
      />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:px-4 md:py-8">{children}</main>
      <BackToTopButton />
    </div>
  );
}
