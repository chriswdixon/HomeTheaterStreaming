"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { WATCH_REGIONS } from "@/lib/regions";
import type { Provider } from "@/lib/effective-services";
import { partitionProviderSections } from "@/lib/featured-providers";
import { tmdbImageUrl } from "@/lib/tmdb";

type Mode = "choose" | "create" | "join";

export function OnboardingForm({
  initialCode,
  addingAnother = false,
}: {
  initialCode?: string;
  addingAnother?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialCode ? "join" : "choose");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("US");
  const [code, setCode] = useState(initialCode ?? "");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Record<number, Provider>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProviders(nextRegion: string) {
    const response = await fetch(`/api/providers?region=${nextRegion}`);
    const data = (await response.json()) as { providers?: Provider[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Could not load streaming services");
    }
    setProviders(data.providers ?? []);
  }

  async function startCreate() {
    setError(null);
    setLoading(true);
    try {
      await loadProviders(region);
      setMode("create");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load services");
    } finally {
      setLoading(false);
    }
  }

  async function onRegionChange(nextRegion: string) {
    setRegion(nextRegion);
    setLoading(true);
    setError(null);
    try {
      await loadProviders(nextRegion);
      setSelected({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load services");
    } finally {
      setLoading(false);
    }
  }

  async function createHousehold(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          region,
          services: Object.values(selected),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not create household");
      router.push("/start");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create household");
    } finally {
      setLoading(false);
    }
  }

  async function joinHousehold(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not join household");
      router.push("/start");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join household");
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? providers.filter((provider) => provider.name.toLowerCase().includes(q))
      : providers;
    return partitionProviderSections(
      visible,
      new Set(Object.keys(selected).map((id) => Number(id))),
    );
  }, [providers, query, selected]);

  function toggle(provider: Provider) {
    setSelected((current) => {
      const next = { ...current };
      if (next[provider.tmdbProviderId]) {
        delete next[provider.tmdbProviderId];
      } else {
        next[provider.tmdbProviderId] = provider;
      }
      return next;
    });
  }

  return (
    <div className="onboarding-shell mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-card/90 p-8 shadow-2xl">
      <p className="page-kicker">{addingAnother ? "Add a shared list" : "Get started"}</p>
      <h1 className="page-title mt-2">
        {addingAnother ? "Join or create another shared list" : "Set up your household"}
      </h1>
      <p className="mt-2 text-sm text-muted md:text-base">
        {addingAnother
          ? "Join with an invite code or create a new shared list. Your personal list stays separate for each one."
          : "Share a watchlist, pick the services you subscribe to, and keep a personal list of your own."}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {mode === "choose" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={startCreate}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-left transition hover:border-accent/50 hover:bg-white/8"
          >
            <h2 className="text-lg font-medium">Create a household</h2>
            <p className="mt-2 text-sm text-muted">
              Name it, pick your country, and choose the services you share.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-left transition hover:border-accent/50 hover:bg-white/8"
          >
            <h2 className="text-lg font-medium">Join with an invite code</h2>
            <p className="mt-2 text-sm text-muted">
              Use the code from someone already in the household.
            </p>
          </button>
        </div>
      ) : null}

      {mode === "join" ? (
        <form onSubmit={joinHousehold} className="mt-8 space-y-4">
          <label className="block text-sm text-muted">
            Invite code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 tracking-[0.3em] text-foreground uppercase"
              placeholder="ABCD2345"
              required
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-black"
            >
              {loading ? "Joining…" : "Join household"}
            </button>
          </div>
        </form>
      ) : null}

      {mode === "create" ? (
        <form onSubmit={createHousehold} className="mt-8 space-y-6">
          <label className="block text-sm text-muted">
            Household name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-foreground"
              placeholder="The Dixons"
              required
            />
          </label>
          <label className="block text-sm text-muted">
            Country
            <select
              value={region}
              onChange={(event) => onRegionChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-foreground"
            >
              {WATCH_REGIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm text-muted">Household streaming services</p>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services"
                className="w-full rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm sm:w-48"
              />
            </div>
            <ProviderChecklist
              heading="Your services"
              providers={sections.selected}
              selected={selected}
              onToggle={toggle}
            />
            <ProviderChecklist
              heading="Popular"
              providers={sections.featured}
              selected={selected}
              onToggle={toggle}
            />
            <ProviderChecklist
              heading="More services"
              providers={sections.rest}
              selected={selected}
              onToggle={toggle}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-black"
            >
              {loading ? "Saving…" : "Create household"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ProviderChecklist({
  heading,
  providers,
  selected,
  onToggle,
}: {
  heading: string;
  providers: Provider[];
  selected: Record<number, Provider>;
  onToggle: (provider: Provider) => void;
}) {
  if (providers.length === 0) return null;

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-xs uppercase tracking-[0.18em] text-muted">
        {heading}
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {providers.map((provider) => {
          const checked = Boolean(selected[provider.tmdbProviderId]);
          const logo = tmdbImageUrl(provider.logoPath, "w92");
          return (
            <li key={provider.tmdbProviderId}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(provider)}
                  className="accent-accent"
                />
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    className="h-8 w-8 rounded-md object-cover"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-md bg-white/10" />
                )}
                <span className="text-sm">{provider.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
