"use client";

import { useState } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import type { StoredWatchlistItem } from "@/lib/server/watchlist-actions";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import type { WatchlistKind } from "@/lib/watchlist";
import { MovieCard } from "./movie-card";
import { MovieSearch } from "./movie-search";

export type WatchlistItemView = StoredWatchlistItem & {
  availability: ViewerAvailability;
};

export function WatchlistView({
  list,
  title,
  description,
  initialItems,
}: {
  list: WatchlistKind;
  title: string;
  description: string;
  initialItems: WatchlistItemView[];
}) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState<string | null>(null);

  async function addMovie(movie: TmdbSearchMovie) {
    setMessage(null);
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list, movie }),
    });
    const data = (await response.json()) as {
      item?: WatchlistItemView;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error ?? "Could not add movie");
    if (data.item) {
      setItems((current) => [data.item!, ...current]);
    }
  }

  async function removeMovie(id: string) {
    const response = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not remove movie");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted">{description}</p>
        </div>
        <p className="text-sm text-muted">{items.length} movies</p>
      </div>
      <MovieSearch onSelect={addMovie} />
      {message ? <p className="mt-3 text-sm text-red-300">{message}</p> : null}
      {items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">Nothing queued yet</h2>
          <p className="mt-2 text-muted">
            Search above to add a movie. Availability badges use your household
            services plus any personal add-ons.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <MovieCard
                title={item.title}
                year={item.year}
                posterPath={item.posterPath}
                overview={item.overview}
                availability={item.availability}
                actions={
                  <button
                    type="button"
                    onClick={() => removeMovie(item.id)}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted hover:text-foreground"
                  >
                    Remove
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
