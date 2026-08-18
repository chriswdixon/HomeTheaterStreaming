"use client";

import { useMemo, useState } from "react";
import type { Provider } from "@/lib/effective-services";
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

  const visibleProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? allProviders.filter((provider) =>
          provider.name.toLowerCase().includes(q),
        )
      : allProviders;
    return [...visible].sort((a, b) => a.name.localeCompare(b.name));
  }, [allProviders, query]);

  function toggle(provider: Provider) {
    if (saving) return;

    const previous = chosen;
    const next = { ...chosen };
    if (next[provider.tmdbProviderId]) {
      delete next[provider.tmdbProviderId];
    } else {
      next[provider.tmdbProviderId] = provider;
    }

    setChosen(next);
    setSaving(true);
    setMessage(null);

    void onSave(Object.values(next))
      .then(() => {
        setMessage("Saved");
      })
      .catch((error) => {
        setChosen(previous);
        setMessage(error instanceof Error ? error.message : "Could not save");
      })
      .finally(() => {
        setSaving(false);
      });
  }

  return (
    <section className="glass rounded-3xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search services"
          className="glass-input max-w-xs px-4 py-2 text-sm"
        />
      </div>
      <ProviderList
        providers={visibleProviders}
        chosen={chosen}
        onToggle={toggle}
        disabled={saving}
      />
      {message ? (
        <p
          className={`mt-5 text-sm ${
            message === "Saved" ? "text-muted" : "text-red-300"
          }`}
        >
          {saving ? "Saving…" : message}
        </p>
      ) : saving ? (
        <p className="mt-5 text-sm text-muted">Saving…</p>
      ) : null}
    </section>
  );
}

function ProviderList({
  providers,
  chosen,
  onToggle,
  disabled = false,
}: {
  providers: Provider[];
  chosen: Record<number, Provider>;
  onToggle: (provider: Provider) => void;
  disabled?: boolean;
}) {
  if (providers.length === 0) return null;

  return (
    <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const logo = tmdbImageUrl(provider.logoPath, "w92");
          return (
            <li key={provider.tmdbProviderId}>
              <label className="glass-subtle flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2">
                <input
                  type="checkbox"
                  checked={Boolean(chosen[provider.tmdbProviderId])}
                  onChange={() => onToggle(provider)}
                  disabled={disabled}
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
  );
}
