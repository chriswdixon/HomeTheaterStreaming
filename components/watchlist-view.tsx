"use client";

import { useMemo, useState } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import {
  filterByGenre,
  genresOnList,
  reorderIds,
  visibleWatchlistItems,
} from "@/lib/list-query";
import type { StoredWatchlistItem } from "@/lib/server/watchlist-actions";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import type { WatchState } from "@/lib/watch-state";
import type { WatchlistKind } from "@/lib/watchlist";
import { ConfirmDialog, RatingDialog } from "./dialogs";
import { MovieCard } from "./movie-card";
import { MovieSearch } from "./movie-search";

export type WatchlistItemView = StoredWatchlistItem & {
  availability: ViewerAvailability;
  watchState: WatchState | null;
};

export function WatchlistView({
  list,
  title,
  description,
  initialItems,
  showSearch = true,
  allowDrag = true,
  mode = "queue",
}: {
  list?: WatchlistKind;
  title: string;
  description: string;
  initialItems: WatchlistItemView[];
  showSearch?: boolean;
  allowDrag?: boolean;
  mode?: "queue" | "watched";
}) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState<string | null>(null);
  const [showWatched, setShowWatched] = useState(mode === "watched");
  const [genreId, setGenreId] = useState<number | null>(null);
  const [ratingItem, setRatingItem] = useState<WatchlistItemView | null>(null);
  const [removeItem, setRemoveItem] = useState<WatchlistItemView | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const states = items
    .map((item) => item.watchState)
    .filter((state): state is WatchState => Boolean(state));

  const displayed = useMemo(() => {
    const byWatch = visibleWatchlistItems(items, states, { showWatched });
    return filterByGenre(byWatch, genreId);
  }, [genreId, items, showWatched, states]);

  const genres = genresOnList(items);

  async function addMovie(movie: TmdbSearchMovie) {
    if (!list) return;
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
    if (!response.ok) throw new Error(data.error ?? "Could not add title");
    if (data.item) {
      setItems((current) => [data.item!, ...current]);
    }
  }

  async function persistOrder(nextItems: WatchlistItemView[]) {
    setItems(nextItems);
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nextItems.map((item) => item.id) }),
    });
  }

  async function rate(item: WatchlistItemView, rating: number) {
    const response = await fetch("/api/watch-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlistItemId: item.id, rating }),
    });
    const data = (await response.json()) as {
      watchState?: WatchState;
      error?: string;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Could not save rating");
      return;
    }
    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, watchState: data.watchState ?? null } : row,
      ),
    );
    setRatingItem(null);
  }

  async function unwatch(item: WatchlistItemView) {
    const response = await fetch(`/api/watch-state?watchlistItemId=${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage("Could not mark as unwatched");
      return;
    }
    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, watchState: null } : row,
      ),
    );
  }

  async function copyToShared(item: WatchlistItemView) {
    setMessage(null);
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        list: "shared",
        movie: {
          tmdbMovieId: item.tmdbMovieId,
          mediaType: item.mediaType,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          overview: item.overview,
        },
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (response.status === 409) {
      setMessage(`${item.title} is already on the shared list`);
      return;
    }
    if (!response.ok) {
      setMessage(data.error ?? "Could not copy to the shared list");
      return;
    }
    setMessage(`Copied ${item.title} to the shared list`);
  }

  async function remove(item: WatchlistItemView) {
    const response = await fetch(`/api/watchlist?id=${item.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not remove title");
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
    setRemoveItem(null);
  }

  function onDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const visibleIds = displayed.map((item) => item.id);
    const toIndex = visibleIds.indexOf(targetId);
    const nextVisible = reorderIds(visibleIds, draggingId, toIndex);
    const byId = new Map(items.map((item) => [item.id, item]));
    const hidden = items.filter((item) => !visibleIds.includes(item.id));
    const next = [
      ...nextVisible.map((id) => byId.get(id)!),
      ...hidden,
    ];
    void persistOrder(next);
    setDraggingId(null);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted">{description}</p>
        </div>
        <p className="text-sm text-muted">{displayed.length} titles</p>
      </div>
      {showSearch && list ? <MovieSearch onSelect={addMovie} /> : null}
      {mode === "queue" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            active={!showWatched}
            onClick={() => setShowWatched(false)}
            label="Unwatched"
          />
          <FilterChip
            active={showWatched}
            onClick={() => setShowWatched(true)}
            label="Watched"
          />
        </div>
      ) : null}
      {genres.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip
            active={genreId == null}
            onClick={() => setGenreId(null)}
            label="All genres"
          />
          {genres.map((genre) => (
            <FilterChip
              key={genre.tmdbGenreId}
              active={genreId === genre.tmdbGenreId}
              onClick={() =>
                setGenreId(
                  genreId === genre.tmdbGenreId ? null : genre.tmdbGenreId,
                )
              }
              label={genre.name}
            />
          ))}
        </div>
      ) : null}
      {message ? (
        <p
          className={`mt-3 text-sm ${
            message.startsWith("Could") ? "text-red-300" : "text-accent"
          }`}
        >
          {message}
        </p>
      ) : null}
      {displayed.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">
            {items.length === 0 ? "Nothing queued yet" : "No titles match"}
          </h2>
          <p className="mt-2 text-muted">
            {items.length === 0
              ? "Search above to add a movie or series."
              : "Try another genre or watched filter."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 items-stretch gap-4 md:grid-cols-4 lg:grid-cols-5">
          {displayed.map((item) => (
            <li
              key={item.id}
              draggable={allowDrag && !showWatched}
              onDragStart={() => setDraggingId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(item.id)}
              className="h-full"
            >
              <MovieCard
                title={item.title}
                year={item.year}
                posterPath={item.posterPath}
                overview={item.overview}
                availability={item.availability}
                mediaType={item.mediaType}
                rating={item.watchState?.rating}
                draggable={allowDrag && !showWatched}
                onWatched={
                  item.watchState ? undefined : () => setRatingItem(item)
                }
                onUnwatch={
                  item.watchState ? () => void unwatch(item) : undefined
                }
                onCopyToShared={
                  item.list === "personal"
                    ? () => void copyToShared(item)
                    : undefined
                }
                onRemove={() => setRemoveItem(item)}
              />
            </li>
          ))}
        </ul>
      )}
      {ratingItem ? (
        <RatingDialog
          title={ratingItem.title}
          onCancel={() => setRatingItem(null)}
          onRate={(value) => void rate(ratingItem, value)}
        />
      ) : null}
      {removeItem ? (
        <ConfirmDialog
          title={`Remove ${removeItem.title}?`}
          message="This takes it off the list for everyone who can see this queue."
          confirmLabel="Remove"
          onCancel={() => setRemoveItem(null)}
          onConfirm={() => void remove(removeItem)}
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs ${
        active ? "bg-accent text-black" : "border border-white/15 text-muted"
      }`}
    >
      {label}
    </button>
  );
}
