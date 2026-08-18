import { describe, expect, it } from "vitest";
import {
  FRANCHISE_WATCH_ORDER_THRESHOLD,
  buildWatchOrderMovies,
  getCuratedWatchOrder,
  getWatchOrderLabel,
  orderMoviesByIds,
  qualifiesForWatchOrder,
  sortByReleaseYear,
} from "./franchise-watch-order";
import type { TmdbSearchMovie } from "./tmdb";

function tmdbMovie(id: number, title: string, year: string): TmdbSearchMovie {
  return {
    tmdbMovieId: id,
    mediaType: "movie",
    title,
    year,
    posterPath: `/${id}.jpg`,
    overview: "",
  };
}

describe("qualifiesForWatchOrder", () => {
  it("requires three or more franchise seeds", () => {
    expect(FRANCHISE_WATCH_ORDER_THRESHOLD).toBe(3);
    expect(qualifiesForWatchOrder(2)).toBe(false);
    expect(qualifiesForWatchOrder(3)).toBe(true);
  });
});

describe("getCuratedWatchOrder", () => {
  it("returns the Star Wars first-watch order", () => {
    expect(getCuratedWatchOrder("Star Wars")).toEqual([
      11, 1891, 1892, 1893, 1894, 1895, 140607, 181808, 181812,
    ]);
  });

  it("returns the MCU theatrical release order", () => {
    const order = getCuratedWatchOrder("Marvel Cinematic Universe");
    expect(order?.[0]).toBe(1726);
    expect(order?.[5]).toBe(24428);
    expect(order?.includes(299534)).toBe(true);
  });

  it("returns null for franchises without a curated path", () => {
    expect(getCuratedWatchOrder("James Bond")).toBeNull();
  });
});

describe("getWatchOrderLabel", () => {
  it("labels curated paths as first-watch order", () => {
    expect(getWatchOrderLabel("Star Wars")).toBe("first-watch");
    expect(getWatchOrderLabel("Marvel Cinematic Universe")).toBe("first-watch");
  });

  it("labels other franchises as release order", () => {
    expect(getWatchOrderLabel("James Bond")).toBe("release");
  });
});

describe("orderMoviesByIds", () => {
  it("preserves curated id order and drops missing titles", () => {
    const ordered = orderMoviesByIds(
      [11, 1891, 99999],
      [tmdbMovie(1891, "Empire", "1980"), tmdbMovie(11, "Hope", "1977")],
    );

    expect(ordered.map((movie) => movie.tmdbMovieId)).toEqual([11, 1891]);
  });
});

describe("sortByReleaseYear", () => {
  it("sorts movies by release year ascending", () => {
    const sorted = sortByReleaseYear([
      tmdbMovie(3, "Three", "2010"),
      tmdbMovie(1, "One", "1962"),
      tmdbMovie(2, "Two", "1977"),
    ]);

    expect(sorted.map((movie) => movie.tmdbMovieId)).toEqual([1, 2, 3]);
  });
});

describe("buildWatchOrderMovies", () => {
  it("numbers the full path and marks listed titles", () => {
    const path = buildWatchOrderMovies(
      [
        {
          tmdbMovieId: 11,
          title: "A New Hope",
          year: "1977",
          posterPath: null,
          overview: "",
          providers: [],
        },
        {
          tmdbMovieId: 1891,
          title: "Empire",
          year: "1980",
          posterPath: null,
          overview: "",
          providers: [],
        },
      ],
      new Set([11]),
    );

    expect(path).toEqual([
      expect.objectContaining({ tmdbMovieId: 11, order: 1, onList: true }),
      expect.objectContaining({ tmdbMovieId: 1891, order: 2, onList: false }),
    ]);
  });
});
