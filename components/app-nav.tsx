"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HouseholdSharingLightbox } from "./household-sharing-lightbox";
import { NotificationsBell } from "./notifications-bell";
import { NAV_ICONS, NavGlassIcon, NavServicesIcon } from "./nav-icons";
import { SharedIcon } from "./icons";
import type { UserNotificationView } from "@/lib/server/notifications";

const LINKS = [
  { href: "/my-list", label: "My list", short: "Mine" },
  { href: "/shared", label: "Shared list", short: "Shared" },
  { href: "/top-100", label: "Top 100", short: "Top 100" },
  { href: "/recently-watched", label: "Recently watched", short: "Recent" },
  { href: "/recommendations", label: "Recommendations", short: "Recs" },
] as const;

export function AppNav({
  household,
  initialNotifications,
  initialUnreadCount,
}: {
  household: { name: string; inviteCode: string; region: string };
  initialNotifications: UserNotificationView[];
  initialUnreadCount: number;
}) {
  const pathname = usePathname();
  const [showHouseholdInvite, setShowHouseholdInvite] = useState(false);

  return (
    <>
      <header className="glass-nav sticky top-0 z-50">
        <div className="app-nav-inner mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3">
        <Link
          href="/start"
          className="app-nav-logo shrink-0 text-base font-semibold tracking-tight md:text-lg"
        >
          ScreenStack
        </Link>
        <nav className="app-nav-links flex min-w-0 flex-1 items-center gap-0.5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const hasIcon = link.href in NAV_ICONS;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                aria-label={link.label}
                className={`glass-nav-link ${active ? "glass-nav-link-active" : ""}`}
              >
                {hasIcon ? <NavGlassIcon href={link.href} /> : null}
                <span className="hidden xl:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={() => setShowHouseholdInvite(true)}
          className="household-nav-button lg:hidden"
          title={`Household: ${household.name}`}
          aria-label={`Household: ${household.name}`}
        >
          <SharedIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowHouseholdInvite(true)}
          className="household-name-button hidden lg:inline"
          title="View household invite code"
        >
          {household.name}
        </button>
        <NotificationsBell
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link
              label="Services"
              labelIcon={<NavServicesIcon />}
              href="/services"
            />
          </UserButton.MenuItems>
        </UserButton>
        </div>
        </div>
      </header>
      {showHouseholdInvite ? (
        <HouseholdSharingLightbox
          householdName={household.name}
          inviteCode={household.inviteCode}
          region={household.region}
          onClose={() => setShowHouseholdInvite(false)}
        />
      ) : null}
    </>
  );
}
