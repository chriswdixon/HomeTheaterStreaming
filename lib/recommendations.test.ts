import { describe, expect, it } from "vitest";
import {
  RECOMMENDATION_UNLOCK_COUNT,
  RECOMMENDATIONS_PER_FRANCHISE,
  groupByFranchise,
  isRecommendationsUnlocked,
  type RecommendedMovie,
} from "./recommendations";

const netflix = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};
const hulu = { tmdbProviderId: 15, name: "Hulu", logoPath: "/hulu.png" };

function movie(
  id: number,
  title: string,
  providers: RecommendedMovie["providers"] = [],
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

describe("groupByFranchise", () => {
  const johnWick4 = movie(4, "John Wick 4", [hulu]);
  const ballerina = movie(5, "Ballerina", []);
  const civilWar = movie(6, "Civil War", [netflix]);

  it("drops titles already on a watchlist", () => {
    const groups = groupByFranchise({
      groups: [
        { name: "John Wick Collection", movies: [johnWick4, ballerina] },
      ],
      excludedTmdbIds: new Set([4]),
    });

    expect(groups[0]?.movies.map((item) => item.tmdbMovieId)).toEqual([5]);
  });

  it("keeps franchise titles that do not stream on subscribed services", () => {
    const groups = groupByFranchise({
      groups: [
        { name: "John Wick Collection", movies: [johnWick4, ballerina] },
      ],
      excludedTmdbIds: new Set(),
    });

    expect(groups[0]?.name).toBe("John Wick Collection");
    expect(groups[0]?.movies.map((item) => item.tmdbMovieId)).toEqual([4, 5]);
  });

  it("does not create groups by streaming service", () => {
    const groups = groupByFranchise({
      groups: [
        { name: "John Wick Collection", movies: [johnWick4] },
        { name: "Marvel Cinematic Universe", movies: [civilWar] },
      ],
      excludedTmdbIds: new Set(),
    });

    expect(groups.map((group) => group.name)).toEqual([
      "John Wick Collection",
      "Marvel Cinematic Universe",
    ]);
  });

  it("caps each franchise at eight recommendations", () => {
    const extras = Array.from({ length: 10 }, (_, index) =>
      movie(100 + index, `Title ${index}`),
    );

    const groups = groupByFranchise({
      groups: [{ name: "Star Wars", movies: extras }],
      excludedTmdbIds: new Set(),
    });

    expect(groups[0]?.movies).toHaveLength(RECOMMENDATIONS_PER_FRANCHISE);
  });
});
