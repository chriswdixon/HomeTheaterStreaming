import { describe, expect, it, vi } from "vitest";
import { getTopMoviesPayload, TOP_MOVIES_LIMIT } from "./top-movies";
import type { TmdbClient } from "@/lib/tmdb";

describe("getTopMoviesPayload", () => {
  it("ranks movies and marks list membership", async () => {
    const movies = Array.from({ length: TOP_MOVIES_LIMIT }, (_, index) => ({
      tmdbMovieId: index + 1,
      mediaType: "movie" as const,
      title: `Movie ${index + 1}`,
      year: "1999",
      posterPath: null,
      overview: "",
    }));

    const tmdb: TmdbClient = {
      searchMovies: vi.fn(),
      getWatchProviders: vi.fn().mockResolvedValue({
        flatrate: [],
        rent: [],
        buy: [],
        watchUrl: null,
      }),
      getMovieRecommendations: vi.fn(),
      getTitleRecommendations: vi.fn(),
      getTitleMeta: vi.fn(),
      getCollectionParts: vi.fn(),
      discoverByKeyword: vi.fn(),
      getMoviesByIds: vi.fn(),
      getTopRatedMovies: vi.fn().mockResolvedValue(movies),
      listWatchProviders: vi.fn(),
    };

    const payload = await getTopMoviesPayload({
      tmdb,
      region: "US",
      personalMovieIds: new Set([1]),
      sharedMovieIds: new Set([2]),
    });

    expect(payload).toHaveLength(TOP_MOVIES_LIMIT);
    expect(payload[0]?.rank).toBe(1);
    expect(payload[99]?.rank).toBe(100);
    expect(payload[0]?.onPersonalList).toBe(true);
    expect(payload[1]?.onSharedList).toBe(true);
  });
});
