import type { Genre } from "./media";
import type { WatchState } from "./watch-state";

export function visibleWatchlistItems<T extends { id: string }>(
  items: T[],
  states: WatchState[],
  options: { showWatched: boolean },
): T[] {
  const watchedIds = new Set(states.map((state) => state.watchlistItemId));
  return items.filter((item) =>
    options.showWatched ? watchedIds.has(item.id) : !watchedIds.has(item.id),
  );
}

export function genresOnList<T extends { genres: Genre[] }>(items: T[]): Genre[] {
  const seen = new Map<number, Genre>();
  for (const item of items) {
    for (const genre of item.genres) {
      seen.set(genre.tmdbGenreId, genre);
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterByGenre<T extends { genres: Genre[] }>(
  items: T[],
  genreId: number | null,
): T[] {
  if (genreId == null) return items;
  return items.filter((item) =>
    item.genres.some((genre) => genre.tmdbGenreId === genreId),
  );
}

export function reorderIds(
  ids: string[],
  movingId: string,
  toIndex: number,
): string[] {
  const fromIndex = ids.indexOf(movingId);
  if (fromIndex < 0) return ids;
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return ids;
  const clamped = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clamped, 0, moved);
  return next;
}
