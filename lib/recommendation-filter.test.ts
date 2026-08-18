import { describe, expect, it } from "vitest";
import {
  filterByViewerServices,
  isOnViewerServices,
} from "./recommendation-filter";

const netflix = { tmdbProviderId: 8, name: "Netflix", logoPath: null };
const hulu = { tmdbProviderId: 15, name: "Hulu", logoPath: null };
const amazonVideo = { tmdbProviderId: 10, name: "Amazon Video", logoPath: null };

describe("isOnViewerServices", () => {
  it("returns true when a title streams on a subscribed service", () => {
    expect(isOnViewerServices([netflix, hulu], [netflix])).toBe(true);
  });

  it("returns false when none of the title providers match", () => {
    expect(isOnViewerServices([hulu], [netflix])).toBe(false);
  });
});

describe("filterByViewerServices", () => {
  const movies = [
    { tmdbMovieId: 1, providers: [netflix], rentProviders: [], onList: false },
    { tmdbMovieId: 2, providers: [hulu], rentProviders: [], onList: false },
    { tmdbMovieId: 3, providers: [hulu], rentProviders: [], onList: true },
    {
      tmdbMovieId: 4,
      providers: [],
      rentProviders: [amazonVideo],
      onList: false,
    },
  ];

  it("returns every title when no services are selected", () => {
    expect(filterByViewerServices(movies, [], [netflix])).toHaveLength(4);
  });

  it("keeps list titles and matches selected services on flatrate or rent", () => {
    expect(
      filterByViewerServices(movies, [netflix.tmdbProviderId], [netflix]).map(
        (movie) => movie.tmdbMovieId,
      ),
    ).toEqual([1, 3]);
    expect(
      filterByViewerServices(
        movies,
        [amazonVideo.tmdbProviderId],
        [netflix, amazonVideo],
      ).map((movie) => movie.tmdbMovieId),
    ).toEqual([3, 4]);
  });
});
