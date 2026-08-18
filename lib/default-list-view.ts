import type { WatchlistKind } from "./watchlist";

export type DefaultListView = WatchlistKind;

export function defaultListPath(view: DefaultListView = "personal"): string {
  return view === "shared" ? "/shared" : "/my-list";
}

export function parseDefaultListView(value: unknown): DefaultListView | null {
  if (value === "personal" || value === "shared") return value;
  return null;
}

export function watchlistItemKey(
  tmdbMovieId: number,
  mediaType: "movie" | "tv",
): string {
  return `${mediaType}:${tmdbMovieId}`;
}
