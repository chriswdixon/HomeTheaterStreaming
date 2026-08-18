"use client";

import { useEffect, useState } from "react";
import { WATCH_REGIONS } from "@/lib/regions";
import type { Provider } from "@/lib/effective-services";
import { mergeEffectiveServices } from "@/lib/effective-services";
import { buildHouseholdInviteUrl } from "@/lib/household-invite";
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [household, setHousehold] = useState(householdServices);
  const [personal, setPersonal] = useState(personalServices);

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

  async function saveEffective(providers: Provider[]) {
    const householdIds = new Set(household.map((provider) => provider.tmdbProviderId));
    const selectedIds = new Set(providers.map((provider) => provider.tmdbProviderId));

    const resolvedHousehold = household.filter((provider) =>
      selectedIds.has(provider.tmdbProviderId),
    );
    const resolvedPersonal = providers.filter(
      (provider) => !householdIds.has(provider.tmdbProviderId),
    );

    await save("household", resolvedHousehold);
    await save("personal", resolvedPersonal);
    setHousehold(resolvedHousehold);
    setPersonal(resolvedPersonal);
  }

  const effectiveServices = mergeEffectiveServices(household, personal);

  useEffect(() => {
    setInviteLink(buildHouseholdInviteUrl(inviteCode, window.location.origin));
  }, [inviteCode]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
        <p className="mt-1 text-muted">
          Pick every service you can stream on. Household services are shared;
          anything you add here that the household does not share is kept as your
          personal add-on.
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
            <p className="text-sm text-muted">Invite link</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
                {inviteLink || "…"}
              </code>
              <button
                type="button"
                onClick={async () => {
                  if (!inviteLink) return;
                  await navigator.clipboard.writeText(inviteLink);
                  setCopiedLink(true);
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                {copiedLink ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
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
                  setCopiedCode(true);
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                {copiedCode ? "Copied" : "Copy code"}
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
        title="Your streaming services"
        description="One list of everything you can watch on. Existing household services stay shared; new picks are saved as personal add-ons."
        allProviders={catalog}
        selected={effectiveServices}
        onSave={saveEffective}
      />
    </div>
  );
}
