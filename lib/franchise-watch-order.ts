import type { RecommendedMovie } from "./recommendations";
import type { TmdbSearchMovie } from "./tmdb";

export const FRANCHISE_WATCH_ORDER_THRESHOLD = 3;

export type WatchOrderLabel = "first-watch" | "release";

export type WatchOrderMovie = RecommendedMovie & {
  order: number;
  onList: boolean;
};

export type WatchOrderGroup = {
  name: string;
  orderLabel: WatchOrderLabel;
  movies: WatchOrderMovie[];
};

const STAR_WARS_FIRST_WATCH = [
  11, 1891, 1892, 1893, 1894, 1895, 140607, 181808, 181812,
];

const MCU_THEATRICAL_RELEASE = [
  1726, 1724, 10138, 10195, 1771, 24428, 68721, 76338, 100402, 118340, 99861,
  102899, 271110, 284052, 283995, 315635, 284053, 284054, 299536, 363088,
  299537, 299534, 429617, 497698, 566525, 524434, 634028, 453395, 616037,
  505642, 640146, 447365, 609681,
];

const CURATED_WATCH_ORDERS: Record<string, number[]> = {
  "Star Wars": STAR_WARS_FIRST_WATCH,
  "Marvel Cinematic Universe": MCU_THEATRICAL_RELEASE,
};

export function qualifiesForWatchOrder(seedCount: number): boolean {
  return seedCount >= FRANCHISE_WATCH_ORDER_THRESHOLD;
}

export function getCuratedWatchOrder(franchiseName: string): number[] | null {
  return CURATED_WATCH_ORDERS[franchiseName] ?? null;
}

export function getWatchOrderLabel(franchiseName: string): WatchOrderLabel {
  return getCuratedWatchOrder(franchiseName) ? "first-watch" : "release";
}

export function orderMoviesByIds(
  ids: number[],
  movies: TmdbSearchMovie[],
): TmdbSearchMovie[] {
  const byId = new Map(movies.map((movie) => [movie.tmdbMovieId, movie]));
  return ids.flatMap((id) => {
    const movie = byId.get(id);
    return movie ? [movie] : [];
  });
}

export function sortByReleaseYear(movies: TmdbSearchMovie[]): TmdbSearchMovie[] {
  return [...movies].sort((a, b) => {
    const yearA = a.year ?? "9999";
    const yearB = b.year ?? "9999";
    return yearA.localeCompare(yearB) || a.title.localeCompare(b.title);
  });
}

export function buildWatchOrderMovies(
  movies: RecommendedMovie[],
  listedIds: Set<number>,
): WatchOrderMovie[] {
  return movies.map((movie, index) => ({
    ...movie,
    order: index + 1,
    onList: listedIds.has(movie.tmdbMovieId),
  }));
}

export function collectionOverlapsWatchPath(
  titleIds: number[],
  watchPathIds: Set<number>,
): boolean {
  return titleIds.some((id) => watchPathIds.has(id));
}
