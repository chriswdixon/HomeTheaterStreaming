"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HouseholdSharingLightbox } from "./household-sharing-lightbox";
import {
  HouseholdSwitcher,
  type HouseholdOption,
} from "./household-switcher";
import { CloseIcon, MenuIcon, SharedIcon } from "./icons";
import { NotificationsBell } from "./notifications-bell";
import {
  NAV_ICONS,
  NavBrandIcon,
  NavGlassIcon,
  NavServicesIcon,
} from "./nav-icons";
import type { UserNotificationView } from "@/lib/server/notifications";

const LINKS = [
  { href: "/my-list", label: "My list" },
  { href: "/shared", label: "Shared list" },
  { href: "/top-100", label: "Top 100" },
  { href: "/recently-watched", label: "Recently watched" },
  { href: "/recommendations", label: "Recommendations" },
] as const;

export function AppNav({
  household,
  households,
  activeHouseholdId,
  initialNotifications,
  initialUnreadCount,
}: {
  household: { name: string; inviteCode: string; region: string };
  households: HouseholdOption[];
  activeHouseholdId: string;
  initialNotifications: UserNotificationView[];
  initialUnreadCount: number;
}) {
  const pathname = usePathname();
  const [showHouseholdInvite, setShowHouseholdInvite] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="glass-nav sticky top-0 z-50">
        <div className="app-nav-inner mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3">
          <button
            type="button"
            className="app-nav-menu-button md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>

          <Link
            href="/start"
            className="app-nav-logo shrink-0"
            aria-label="ScreenStack home"
          >
            <span className="app-nav-brand-icon md:hidden">
              <NavBrandIcon />
            </span>
            <span className="hidden text-base font-semibold tracking-tight md:inline md:text-lg">
              ScreenStack
            </span>
          </Link>

          <nav className="app-nav-links hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
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

          <div className="ml-auto flex min-w-0 shrink items-center gap-1.5 md:ml-0 md:gap-2">
            <div className="hidden min-w-0 md:block">
              <HouseholdSwitcher
                households={households}
                activeHouseholdId={activeHouseholdId}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowHouseholdInvite(true)}
              className="household-nav-button md:hidden"
              title={`Shared list: ${household.name}`}
              aria-label={`Shared list: ${household.name}`}
            >
              <SharedIcon className="h-4 w-4" />
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

      {menuOpen ? (
        <div className="app-nav-drawer-overlay md:hidden" onClick={() => setMenuOpen(false)}>
          <nav
            className="app-nav-drawer"
            aria-label="Main navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-3 pb-3">
              <HouseholdSwitcher
                households={households}
                activeHouseholdId={activeHouseholdId}
              />
            </div>
            <ul className="app-nav-drawer-list">
              {LINKS.map((link) => {
                const active = pathname === link.href;
                const hasIcon = link.href in NAV_ICONS;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`app-nav-drawer-link ${active ? "app-nav-drawer-link-active" : ""}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {hasIcon ? <NavGlassIcon href={link.href} /> : null}
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}

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
