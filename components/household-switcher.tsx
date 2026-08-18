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
}: {
  households: HouseholdOption[];
  activeHouseholdId: string;
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

  async function switchHousehold(householdId: string) {
    if (householdId === activeHouseholdId || switching) return;
    setSwitching(true);
    setOpen(false);
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

  return (
    <div ref={rootRef} className="household-switcher">
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
        <div className="household-switcher-menu" role="listbox" aria-label="Shared lists">
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
            <Link
              href="/create-list"
              className="household-switcher-action"
              onClick={() => setOpen(false)}
            >
              Create new shared list
            </Link>
            <Link
              href="/join-list"
              className="household-switcher-action"
              onClick={() => setOpen(false)}
            >
              Join with invite code
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
