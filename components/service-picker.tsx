"use client";

import { useMemo, useState } from "react";
import type { Provider } from "@/lib/effective-services";
import { partitionProviders } from "@/lib/featured-providers";
import { tmdbImageUrl } from "@/lib/tmdb";

export function ServicePicker({
  title,
  description,
  allProviders,
  selected,
  onSave,
}: {
  title: string;
  description: string;
  allProviders: Provider[];
  selected: Provider[];
  onSave: (providers: Provider[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Record<number, Provider>>(() =>
    Object.fromEntries(selected.map((provider) => [provider.tmdbProviderId, provider])),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? allProviders.filter((provider) =>
          provider.name.toLowerCase().includes(q),
        )
      : allProviders;
    return partitionProviders(visible);
  }, [allProviders, query]);

  function toggle(provider: Provider) {
    setChosen((current) => {
      const next = { ...current };
      if (next[provider.tmdbProviderId]) {
        delete next[provider.tmdbProviderId];
      } else {
        next[provider.tmdbProviderId] = provider;
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(Object.values(chosen));
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card/70 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search services"
          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm"
        />
      </div>
      <ProviderList
        heading="Popular"
        providers={filtered.featured}
        chosen={chosen}
        onToggle={toggle}
      />
      <ProviderList
        heading="More services"
        providers={filtered.rest}
        chosen={chosen}
        onToggle={toggle}
      />
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-black"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </section>
  );
}

function ProviderList({
  heading,
  providers,
  chosen,
  onToggle,
}: {
  heading: string;
  providers: Provider[];
  chosen: Record<number, Provider>;
  onToggle: (provider: Provider) => void;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs uppercase tracking-[0.18em] text-muted">
        {heading}
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const logo = tmdbImageUrl(provider.logoPath, "w92");
          return (
            <li key={provider.tmdbProviderId}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={Boolean(chosen[provider.tmdbProviderId])}
                  onChange={() => onToggle(provider)}
                  className="accent-accent"
                />
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <span className="h-8 w-8 rounded-md bg-white/10" />
                )}
                <span className="text-sm">{provider.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
