"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/my-list", label: "My list" },
  { href: "/shared", label: "Shared list" },
  { href: "/recently-watched", label: "Recently watched" },
  { href: "/services", label: "Services" },
  { href: "/recommendations", label: "Recommendations" },
];

export function AppNav({ householdName }: { householdName: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link href="/my-list" className="text-lg font-semibold tracking-tight">
          ScreenStack
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-accent text-black"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <p className="hidden text-sm text-muted sm:block">{householdName}</p>
        <UserButton />
      </div>
    </header>
  );
}
