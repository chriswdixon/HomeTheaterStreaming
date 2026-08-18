import { describe, expect, it } from "vitest";
import {
  filterByGenre,
  genresOnList,
  reorderIds,
  visibleWatchlistItems,
} from "./list-query";
import { detectSeriesAndFranchises } from "./series";
import { isDuplicateWatchlistItem } from "./watchlist";
import {
  recentlyWatchedItems,
  upsertWatchState,
  removeWatchState,
} from "./watch-state";

const action = {
  tmdbGenreId: 28,
  name: "Action",
};
const comedy = {
  tmdbGenreId: 35,
  name: "Comedy",
};

describe("isDuplicateWatchlistItem", () => {
  it("treats the same TMDB id as distinct when one is a movie and one is a series", () => {
    expect(
      isDuplicateWatchlistItem(
        [
          {
            list: "personal",
            ownerUserId: "user-1",
            tmdbMovieId: 42,
            mediaType: "movie",
          },
        ],
        {
          list: "personal",
          ownerUserId: "user-1",
          tmdbMovieId: 42,
          mediaType: "tv",
        },
      ),
    ).toBe(false);
  });
});

describe("watch state", () => {
  it("requires a 1-5 rating to mark watched and can unwatch", () => {
    const rated = upsertWatchState([], {
      watchlistItemId: "a",
      rating: 4,
      watchedAt: "2026-08-18T12:00:00.000Z",
    });
    expect(rated).toEqual([
      {
        watchlistItemId: "a",
        rating: 4,
        watchedAt: "2026-08-18T12:00:00.000Z",
      },
    ]);
    expect(removeWatchState(rated, "a")).toEqual([]);
  });

  it("rejects a rating outside 1-5", () => {
    expect(() =>
      upsertWatchState([], {
        watchlistItemId: "a",
        rating: 0,
        watchedAt: "2026-08-18T12:00:00.000Z",
      }),
    ).toThrow(/rating/i);
  });

  it("sorts recently watched by watchedAt descending", () => {
    const items = [
      { id: "old", title: "Heat" },
      { id: "new", title: "Dune" },
    ];
    const states = [
      {
        watchlistItemId: "old",
        rating: 5,
        watchedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        watchlistItemId: "new",
        rating: 3,
        watchedAt: "2026-08-01T00:00:00.000Z",
      },
    ];
    expect(recentlyWatchedItems(items, states).map((item) => item.id)).toEqual([
      "new",
      "old",
    ]);
  });
});

describe("list query", () => {
  const wick = {
    id: "1",
    title: "John Wick",
    genres: [action],
  };
  const lasso = {
    id: "2",
    title: "Ted Lasso",
    genres: [comedy],
  };

  it("hides watched titles from the default queue", () => {
    const visible = visibleWatchlistItems(
      [wick, lasso],
      [{ watchlistItemId: "1", rating: 5, watchedAt: "2026-08-18T12:00:00.000Z" }],
      { showWatched: false },
    );
    expect(visible.map((item) => item.id)).toEqual(["2"]);
  });

  it("shows only watched titles when the watched filter is on", () => {
    const visible = visibleWatchlistItems(
      [wick, lasso],
      [{ watchlistItemId: "1", rating: 5, watchedAt: "2026-08-18T12:00:00.000Z" }],
      { showWatched: true },
    );
    expect(visible.map((item) => item.id)).toEqual(["1"]);
  });

  it("filters to a selected genre and lists genres present on the queue", () => {
    expect(genresOnList([wick, lasso])).toEqual([action, comedy]);
    expect(filterByGenre([wick, lasso], action.tmdbGenreId).map((item) => item.id)).toEqual(
      ["1"],
    );
  });

  it("reorders ids by drag-and-drop", () => {
    expect(reorderIds(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(reorderIds(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });
});

describe("detectSeriesAndFranchises", () => {
  it("recommends a collection when two personal titles belong to it", () => {
    const groups = detectSeriesAndFranchises([
      {
        tmdbMovieId: 1,
        collectionId: 10,
        collectionName: "John Wick Collection",
        keywords: [],
      },
      {
        tmdbMovieId: 2,
        collectionId: 10,
        collectionName: "John Wick Collection",
        keywords: [],
      },
      {
        tmdbMovieId: 3,
        collectionId: 99,
        collectionName: "One-off",
        keywords: [],
      },
    ]);

    expect(groups).toEqual([
      {
        kind: "collection",
        id: "collection-10",
        name: "John Wick Collection",
        seedTmdbIds: [1, 2],
        collectionId: 10,
        keywordId: null,
      },
    ]);
  });

  it("recommends a franchise when two personal titles share a franchise keyword", () => {
    const groups = detectSeriesAndFranchises([
      {
        tmdbMovieId: 11,
        collectionId: null,
        collectionName: null,
        keywords: [
          { tmdbKeywordId: 180547, name: "marvel cinematic universe" },
        ],
      },
      {
        tmdbMovieId: 12,
        collectionId: null,
        collectionName: null,
        keywords: [
          { tmdbKeywordId: 180547, name: "marvel cinematic universe" },
        ],
      },
    ]);

    expect(groups).toEqual([
      {
        kind: "franchise",
        id: "franchise-180547",
        name: "Marvel Cinematic Universe",
        seedTmdbIds: [11, 12],
        collectionId: null,
        keywordId: 180547,
      },
    ]);
  });
});
