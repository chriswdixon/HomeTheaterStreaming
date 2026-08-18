"use client";

import { useState } from "react";
import { WATCH_REGIONS } from "@/lib/regions";
import type { Provider } from "@/lib/effective-services";
import { ServicePicker } from "./service-picker";

export function ServicesManager({
  householdName,
  inviteCode,
  region,
  catalog,
  householdServices,
  personalServices,
}: {
  householdName: string;
  inviteCode: string;
  region: string;
  catalog: Provider[];
  householdServices: Provider[];
  personalServices: Provider[];
}) {
  const [currentRegion, setCurrentRegion] = useState(region);
  const [name, setName] = useState(householdName);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function saveHouseholdMeta(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/household", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, region: currentRegion }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(data.error ?? "Could not update household");
      return;
    }
    setStatus(
      currentRegion !== region
        ? "Saved. Availability was refreshed for the new country."
        : "Saved.",
    );
  }

  async function save(scope: "household" | "personal", providers: Provider[]) {
    const response = await fetch("/api/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, providers }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not save services");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
        <p className="mt-1 text-muted">
          Household services apply to everyone. Add anything you subscribe to on
          your own below.
        </p>
      </div>

      <section className="glass rounded-3xl p-6">
        <h2 className="text-xl font-medium">Household</h2>
        <form onSubmit={saveHouseholdMeta} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-muted">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-foreground"
            />
          </label>
          <label className="text-sm text-muted">
            Country
            <select
              value={currentRegion}
              onChange={(event) => setCurrentRegion(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-foreground"
            >
              {WATCH_REGIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted">Invite code</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 tracking-[0.3em]">
                {inviteCode}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteCode);
                  setCopied(true);
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-black"
            >
              Save household
            </button>
            {status ? <p className="mt-2 text-sm text-muted">{status}</p> : null}
          </div>
        </form>
      </section>

      <ServicePicker
        title="Household services"
        description="Anyone in the household can update these."
        allProviders={catalog}
        selected={householdServices}
        onSave={(providers) => save("household", providers)}
      />
      <ServicePicker
        title="Only you subscribe to"
        description="Services the rest of the household doesn't share — for example, your own Crunchyroll or Viki account. We combine these with household services when showing what's available to you."
        allProviders={catalog}
        selected={personalServices}
        onSave={(providers) => save("personal", providers)}
      />
    </div>
  );
}
