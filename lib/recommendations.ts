import type { Provider } from "./effective-services";
import type { MediaType } from "./media";

export type { Provider };

export const RECOMMENDATION_UNLOCK_COUNT = 10;
export const RECOMMENDATIONS_PER_FRANCHISE = 8;
export const GENERAL_RECOMMENDATIONS_LIMIT = 20;

export type RecommendedMovie = {
  tmdbMovieId: number;
  mediaType?: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  providers: Provider[];
  rentProviders?: Provider[];
  contentRating?: string | null;
};

export type RankedMovie = RecommendedMovie & { score: number };

export type AffinityGroup = {
  name: string;
  movies: RankedMovie[];
};

export type { WatchOrderGroup, WatchOrderMovie } from "./franchise-watch-order";

export function isRecommendationsUnlocked(personalCount: number): boolean {
  return personalCount >= RECOMMENDATION_UNLOCK_COUNT;
}

export function groupByFranchise(input: {
  groups: { name: string; movies: RecommendedMovie[] }[];
  excludedTmdbIds: Set<number>;
  perGroupLimit?: number;
}): AffinityGroup[] {
  const limit = input.perGroupLimit ?? RECOMMENDATIONS_PER_FRANCHISE;

  return input.groups
    .map((group) => {
      const seen = new Set<number>();
      const movies: RankedMovie[] = [];
      for (const movie of group.movies) {
        if (seen.has(movie.tmdbMovieId)) continue;
        seen.add(movie.tmdbMovieId);
        if (input.excludedTmdbIds.has(movie.tmdbMovieId)) continue;
        movies.push({ ...movie, score: 1 });
        if (movies.length >= limit) break;
      }
      return { name: group.name, movies };
    })
    .filter((group) => group.movies.length > 0);
}

export function rankGeneralRecommendations(input: {
  recommendationSets: RecommendedMovie[][];
  excludedTmdbIds: Set<number>;
  excludeTmdbIds?: Set<number>;
  limit?: number;
}): RankedMovie[] {
  const limit = input.limit ?? GENERAL_RECOMMENDATIONS_LIMIT;
  const scored = new Map<number, RankedMovie>();

  for (const set of input.recommendationSets) {
    const seenInSet = new Set<number>();
    for (const movie of set) {
      if (seenInSet.has(movie.tmdbMovieId)) continue;
      seenInSet.add(movie.tmdbMovieId);
      if (input.excludedTmdbIds.has(movie.tmdbMovieId)) continue;
      if (input.excludeTmdbIds?.has(movie.tmdbMovieId)) continue;

      const existing = scored.get(movie.tmdbMovieId);
      if (existing) {
        existing.score += 1;
        continue;
      }

      scored.set(movie.tmdbMovieId, { ...movie, score: 1 });
    }
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
