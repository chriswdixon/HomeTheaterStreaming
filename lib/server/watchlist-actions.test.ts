import { describe, expect, it, vi } from "vitest";
import {
  addWatchlistItem,
  getRecommendationPayload,
  type WatchlistStore,
} from "./watchlist-actions";
import type { TmdbClient } from "../tmdb";
import type { Provider, RecommendedMovie } from "../recommendations";

const netflix: Provider = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};

const dune: RecommendedMovie = {
  tmdbMovieId: 101,
  title: "Dune",
  year: "2021",
  posterPath: "/dune.jpg",
  overview: "Sand",
  providers: [netflix],
};

function mockTmdb(overrides: Partial<TmdbClient> = {}): TmdbClient {
  return {
    searchMovies: vi.fn(),
    getWatchProviders: vi.fn().mockResolvedValue([netflix]),
    getMovieRecommendations: vi.fn().mockResolvedValue([dune]),
    listWatchProviders: vi.fn(),
    ...overrides,
  };
}

function memoryStore(
  seed: Parameters<WatchlistStore["listItems"]> extends never
    ? never
    : Awaited<ReturnType<WatchlistStore["listItems"]>> = [],
): WatchlistStore & { items: typeof seed } {
  const items = [...seed];
  return {
    items,
    async listItems() {
      return items;
    },
    async insertItem(item) {
      items.push({
        id: `id-${items.length + 1}`,
        ...item,
      });
      return items[items.length - 1]!;
    },
  };
}

describe("addWatchlistItem", () => {
  it("rejects a duplicate movie on the same list", async () => {
    const store = memoryStore([
      {
        id: "existing",
        list: "personal",
        ownerUserId: "user-1",
        tmdbMovieId: 42,
        title: "Heat",
        year: "1995",
        posterPath: null,
        overview: "",
        cachedFlatrateProviders: [],
        addedByUserId: "user-1",
      },
    ]);

    const result = await addWatchlistItem(
      { tmdb: mockTmdb(), store },
      {
        list: "personal",
        ownerUserId: "user-1",
        addedByUserId: "user-1",
        region: "US",
        movie: {
          tmdbMovieId: 42,
          title: "Heat",
          year: "1995",
          posterPath: null,
          overview: "",
        },
      },
    );

    expect(result).toEqual({ ok: false, error: "duplicate" });
    expect(store.items).toHaveLength(1);
  });

  it("caches flatrate providers from TMDB when adding a movie", async () => {
    const store = memoryStore([]);
    const tmdb = mockTmdb({
      getWatchProviders: vi.fn().mockResolvedValue([netflix]),
    });

    const result = await addWatchlistItem(
      { tmdb, store },
      {
        list: "shared",
        ownerUserId: null,
        addedByUserId: "user-1",
        region: "US",
        movie: {
          tmdbMovieId: 550,
          title: "Fight Club",
          year: "1999",
          posterPath: "/fc.jpg",
          overview: "Soap",
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(tmdb.getWatchProviders).toHaveBeenCalledWith(550, "US");
    expect(store.items[0]?.cachedFlatrateProviders).toEqual([netflix]);
  });
});

describe("getRecommendationPayload", () => {
  it("stays gated until the personal list has 10 movies", async () => {
    const personal = Array.from({ length: 9 }, (_, index) => ({
      id: String(index),
      list: "personal" as const,
      ownerUserId: "user-1",
      tmdbMovieId: index + 1,
      title: `Movie ${index}`,
      year: "2020",
      posterPath: null,
      overview: "",
      cachedFlatrateProviders: [netflix],
      addedByUserId: "user-1",
    }));

    const payload = await getRecommendationPayload(
      { tmdb: mockTmdb(), store: memoryStore(personal) },
      {
        ownerUserId: "user-1",
        effectiveProviders: [netflix],
        region: "US",
      },
    );

    expect(payload).toEqual({
      unlocked: false,
      count: 9,
      needed: 10,
    });
  });

  it("returns grouped recommendations after 10 personal movies", async () => {
    const personal = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      list: "personal" as const,
      ownerUserId: "user-1",
      tmdbMovieId: index + 1,
      title: `Movie ${index}`,
      year: "2020",
      posterPath: null,
      overview: "",
      cachedFlatrateProviders: [netflix],
      addedByUserId: "user-1",
    }));

    const tmdb = mockTmdb({
      getMovieRecommendations: vi.fn().mockResolvedValue([dune]),
      getWatchProviders: vi.fn().mockResolvedValue([netflix]),
    });

    const payload = await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      {
        ownerUserId: "user-1",
        effectiveProviders: [netflix],
        region: "US",
      },
    );

    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(payload.groups[0]?.provider.tmdbProviderId).toBe(8);
      expect(payload.groups[0]?.movies[0]?.tmdbMovieId).toBe(101);
    }
  });
});
