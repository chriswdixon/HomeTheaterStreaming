import type { Provider } from "./effective-services";
import type { MediaType } from "./media";

export type { Provider };

export const RECOMMENDATION_UNLOCK_COUNT = 10;
export const RECOMMENDATIONS_PER_PROVIDER = 5;

export type RecommendedMovie = {
  tmdbMovieId: number;
  mediaType?: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  providers: Provider[];
};

export type RankedMovie = RecommendedMovie & { score: number };

export type RecommendationGroup = {
  provider: Provider;
  movies: RankedMovie[];
};

export type AffinityGroup = {
  name: string;
  movies: RankedMovie[];
};

export function isRecommendationsUnlocked(personalCount: number): boolean {
  return personalCount >= RECOMMENDATION_UNLOCK_COUNT;
}

export function matchingProviders(
  movieProviders: Provider[],
  effectiveProviderIds: Set<number>,
): Provider[] {
  return movieProviders.filter((provider) =>
    effectiveProviderIds.has(provider.tmdbProviderId),
  );
}

export function rankAndGroupRecommendations(input: {
  recommendationSets: RecommendedMovie[][];
  excludedTmdbIds: Set<number>;
  effectiveProviderIds: Set<number>;
  perProviderLimit?: number;
}): RecommendationGroup[] {
  const limit = input.perProviderLimit ?? RECOMMENDATIONS_PER_PROVIDER;
  const scored = new Map<number, RankedMovie>();

  for (const set of input.recommendationSets) {
    const seenInSet = new Set<number>();
    for (const movie of set) {
      if (seenInSet.has(movie.tmdbMovieId)) continue;
      seenInSet.add(movie.tmdbMovieId);
      if (input.excludedTmdbIds.has(movie.tmdbMovieId)) continue;

      const providers = matchingProviders(
        movie.providers,
        input.effectiveProviderIds,
      );
      if (providers.length === 0) continue;

      const existing = scored.get(movie.tmdbMovieId);
      if (existing) {
        existing.score += 1;
        continue;
      }

      scored.set(movie.tmdbMovieId, { ...movie, providers, score: 1 });
    }
  }

  const groups = new Map<number, RecommendationGroup>();
  for (const movie of scored.values()) {
    for (const provider of movie.providers) {
      const group = groups.get(provider.tmdbProviderId) ?? {
        provider,
        movies: [],
      };
      group.movies.push(movie);
      groups.set(provider.tmdbProviderId, group);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      movies: group.movies
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, limit),
    }))
    .sort((a, b) => a.provider.name.localeCompare(b.provider.name));
}
