"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type HouseholdOption = {
  id: string;
  name: string;
  role: "owner" | "member";
};

export function HouseholdSwitcher({
  households,
  activeHouseholdId,
  onViewInvite,
  onNavigate,
  variant = "header",
}: {
  households: HouseholdOption[];
  activeHouseholdId: string;
  onViewInvite?: () => void;
  onNavigate?: () => void;
  variant?: "header" | "drawer";
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const active =
    households.find((household) => household.id === activeHouseholdId) ??
    households[0];

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
    }
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function closeMenu() {
    setOpen(false);
    onNavigate?.();
  }

  async function switchHousehold(householdId: string) {
    if (householdId === activeHouseholdId || switching) return;
    setSwitching(true);
    setOpen(false);
    onNavigate?.();
    try {
      const response = await fetch("/api/household/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      if (!response.ok) return;
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  if (!active || households.length === 0) return null;

  const menuClass =
    variant === "drawer"
      ? "household-switcher-menu household-switcher-menu-drawer"
      : "household-switcher-menu household-switcher-menu-header";

  return (
    <div
      ref={rootRef}
      className={`household-switcher ${variant === "drawer" ? "household-switcher-drawer" : ""}`}
    >
      <button
        type="button"
        className="household-switcher-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        title="Switch shared list"
      >
        <span className="household-switcher-label">{active.name}</span>
        <span className="text-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className={menuClass} role="listbox" aria-label="Shared lists">
          <p className="household-switcher-heading">Your shared lists</p>
          <ul className="household-switcher-list">
            {households.map((household) => {
              const selected = household.id === activeHouseholdId;
              return (
                <li key={household.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={switching}
                    onClick={() => void switchHousehold(household.id)}
                    className={`household-switcher-option ${
                      selected ? "household-switcher-option-active" : ""
                    }`}
                  >
                    <span className="font-medium">{household.name}</span>
                    <span className="text-xs text-muted capitalize">
                      {household.role}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="household-switcher-actions">
            {onViewInvite ? (
              <button
                type="button"
                className="household-switcher-action w-full text-left"
                onClick={() => {
                  closeMenu();
                  onViewInvite();
                }}
              >
                View invite code
              </button>
            ) : null}
            <Link
              href="/create-list"
              className="household-switcher-action"
              onClick={closeMenu}
            >
              Create new shared list
            </Link>
            <Link
              href="/join-list"
              className="household-switcher-action"
              onClick={closeMenu}
            >
              Join with invite code
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
