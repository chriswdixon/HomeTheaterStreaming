import { describe, expect, it } from "vitest";
import {
  filterByViewerServices,
  isOnViewerServices,
} from "./recommendation-filter";

const netflix = { tmdbProviderId: 8, name: "Netflix", logoPath: null };
const hulu = { tmdbProviderId: 15, name: "Hulu", logoPath: null };

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
    { tmdbMovieId: 1, providers: [netflix], onList: false },
    { tmdbMovieId: 2, providers: [hulu], onList: false },
    { tmdbMovieId: 3, providers: [hulu], onList: true },
  ];

  it("returns every title in all-services mode", () => {
    expect(filterByViewerServices(movies, "all", [netflix])).toHaveLength(3);
  });

  it("keeps list titles and matches on the viewer's services", () => {
    expect(
      filterByViewerServices(movies, "my-services", [netflix]).map(
        (movie) => movie.tmdbMovieId,
      ),
    ).toEqual([1, 3]);
  });
});
