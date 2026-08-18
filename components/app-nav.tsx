"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HouseholdSharingLightbox } from "./household-sharing-lightbox";
import { NAV_ICONS, NavGlassIcon, NavServicesIcon } from "./nav-icons";

const LINKS = [
  { href: "/my-list", label: "My list", short: "Mine" },
  { href: "/shared", label: "Shared list", short: "Shared" },
  { href: "/top-100", label: "Top 100", short: "Top 100" },
  { href: "/recently-watched", label: "Recently watched", short: "Recent" },
  { href: "/recommendations", label: "Recommendations", short: "Recs" },
] as const;

export function AppNav({
  household,
}: {
  household: { name: string; inviteCode: string; region: string };
}) {
  const pathname = usePathname();
  const [showHouseholdInvite, setShowHouseholdInvite] = useState(false);

  return (
    <>
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/start" className="pr-2 text-lg font-semibold tracking-tight">
          ScreenStack
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const hasIcon = link.href in NAV_ICONS;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={`glass-nav-link ${active ? "glass-nav-link-active" : ""}`}
              >
                {hasIcon ? <NavGlassIcon href={link.href} /> : null}
                <span className="hidden md:inline">{link.label}</span>
                <span className="md:hidden">{link.short}</span>
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setShowHouseholdInvite(true)}
          className="household-name-button hidden lg:inline"
          title="View household invite code"
        >
          {household.name}
        </button>
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
