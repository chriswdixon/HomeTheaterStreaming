import { describe, expect, it } from "vitest";
import {
  RECOMMENDATION_UNLOCK_COUNT,
  RECOMMENDATIONS_PER_PROVIDER,
  isRecommendationsUnlocked,
  rankAndGroupRecommendations,
  type RecommendedMovie,
} from "./recommendations";

const netflix = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};
const max = { tmdbProviderId: 1899, name: "Max", logoPath: "/max.png" };
const hulu = { tmdbProviderId: 15, name: "Hulu", logoPath: "/hulu.png" };

function movie(
  id: number,
  title: string,
  providers: RecommendedMovie["providers"],
): RecommendedMovie {
  return {
    tmdbMovieId: id,
    title,
    year: "2024",
    posterPath: `/${id}.jpg`,
    overview: `${title} overview`,
    providers,
  };
}

describe("isRecommendationsUnlocked", () => {
  it("stays locked until the personal list has 10 movies", () => {
    expect(isRecommendationsUnlocked(9)).toBe(false);
    expect(isRecommendationsUnlocked(RECOMMENDATION_UNLOCK_COUNT)).toBe(true);
    expect(isRecommendationsUnlocked(11)).toBe(true);
  });
});

describe("rankAndGroupRecommendations", () => {
  const dune = movie(1, "Dune", [netflix, max]);
  const heat = movie(2, "Heat", [max]);
  const clueless = movie(3, "Clueless", [hulu]);
  const arrival = movie(4, "Arrival", [netflix]);

  it("drops titles already on a watchlist", () => {
    const groups = rankAndGroupRecommendations({
      recommendationSets: [[dune, heat]],
      excludedTmdbIds: new Set([1]),
      effectiveProviderIds: new Set([8, 1899]),
    });

    const ids = groups.flatMap((group) =>
      group.movies.map((item) => item.tmdbMovieId),
    );
    expect(ids).not.toContain(1);
    expect(ids).toContain(2);
  });

  it("keeps only movies that stream on an effective service", () => {
    const groups = rankAndGroupRecommendations({
      recommendationSets: [[dune, clueless]],
      excludedTmdbIds: new Set(),
      effectiveProviderIds: new Set([8, 1899]),
    });

    const ids = groups.flatMap((group) =>
      group.movies.map((item) => item.tmdbMovieId),
    );
    expect(ids).toContain(1);
    expect(ids).not.toContain(3);
  });

  it("ranks movies recommended by more source titles higher", () => {
    const groups = rankAndGroupRecommendations({
      recommendationSets: [[dune, arrival], [dune]],
      excludedTmdbIds: new Set(),
      effectiveProviderIds: new Set([8]),
    });

    const netflixGroup = groups.find(
      (group) => group.provider.tmdbProviderId === 8,
    );
    expect(netflixGroup?.movies.map((item) => item.tmdbMovieId)).toEqual([
      1, 4,
    ]);
    expect(netflixGroup?.movies[0]?.score).toBe(2);
  });

  it("lists a movie under each matching service", () => {
    const groups = rankAndGroupRecommendations({
      recommendationSets: [[dune]],
      excludedTmdbIds: new Set(),
      effectiveProviderIds: new Set([8, 1899]),
    });

    expect(
      groups.map((group) => group.provider.tmdbProviderId).sort((a, b) => a - b),
    ).toEqual([8, 1899]);
    for (const group of groups) {
      expect(group.movies.map((item) => item.tmdbMovieId)).toEqual([1]);
    }
  });

  it("caps each service at five recommendations", () => {
    const extras = Array.from({ length: 7 }, (_, index) =>
      movie(100 + index, `Title ${index}`, [netflix]),
    );

    const groups = rankAndGroupRecommendations({
      recommendationSets: [extras],
      excludedTmdbIds: new Set(),
      effectiveProviderIds: new Set([8]),
    });

    expect(groups[0]?.movies).toHaveLength(RECOMMENDATIONS_PER_PROVIDER);
  });
});
