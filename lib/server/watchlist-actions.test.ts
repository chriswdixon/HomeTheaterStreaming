import { describe, expect, it, vi } from "vitest";
import {
  addWatchlistItem,
  getRecommendationPayload,
  MAX_WATCH_PROVIDER_LOOKUPS,
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

const emptyWatch = {
  flatrate: [] as Provider[],
  rent: [] as Provider[],
  buy: [] as Provider[],
  watchUrl: null as string | null,
};

function mockTmdb(overrides: Partial<TmdbClient> = {}): TmdbClient {
  return {
    searchMovies: vi.fn(),
    getWatchProviders: vi.fn().mockResolvedValue({
      ...emptyWatch,
      flatrate: [netflix],
    }),
    getMovieRecommendations: vi.fn().mockResolvedValue([dune]),
    listWatchProviders: vi.fn(),
    ...overrides,
  };
}

function personalMovies(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    list: "personal" as const,
    ownerUserId: "user-1",
    tmdbMovieId: index + 1,
    title: `Movie ${index}`,
    year: "2020",
    posterPath: null,
    overview: "",
    cachedFlatrateProviders: [netflix],
    cachedRentProviders: [],
    watchUrl: null,
    addedByUserId: "user-1",
  }));
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
        cachedRentProviders: [],
        watchUrl: null,
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
      getWatchProviders: vi.fn().mockResolvedValue({
        ...emptyWatch,
        flatrate: [netflix],
        rent: [
          {
            tmdbProviderId: 10,
            name: "Amazon Video",
            logoPath: "/amazon.png",
          },
        ],
        watchUrl: "https://www.themoviedb.org/movie/550/watch?locale=US",
      }),
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
    expect(store.items[0]?.cachedRentProviders).toEqual([
      {
        tmdbProviderId: 10,
        name: "Amazon Video",
        logoPath: "/amazon.png",
      },
    ]);
    expect(store.items[0]?.watchUrl).toBe(
      "https://www.themoviedb.org/movie/550/watch?locale=US",
    );
  });
});

describe("getRecommendationPayload", () => {
  it("stays gated until the personal list has 10 movies", async () => {
    const personal = personalMovies(9);

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
    const personal = personalMovies(10);

    const tmdb = mockTmdb({
      getMovieRecommendations: vi.fn().mockResolvedValue([dune]),
      getWatchProviders: vi.fn().mockResolvedValue({
        ...emptyWatch,
        flatrate: [netflix],
      }),
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

  it("keeps recommendations when some TMDB watch-provider lookups fail", async () => {
    const personal = personalMovies(10);
    const flop: RecommendedMovie = {
      tmdbMovieId: 14831,
      title: "The Flop",
      year: "1980",
      posterPath: null,
      overview: "",
      providers: [],
    };
    const tmdb = mockTmdb({
      getMovieRecommendations: vi.fn().mockResolvedValue([
        { ...dune, providers: [] },
        flop,
      ]),
      getWatchProviders: vi.fn().mockImplementation(async (id: number) => {
        if (id === flop.tmdbMovieId) {
          throw new Error("TMDB request failed (429) for /movie/14831/watch/providers");
        }
        return { ...emptyWatch, flatrate: [netflix] };
      }),
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
      expect(payload.groups[0]?.movies.map((movie) => movie.tmdbMovieId)).toEqual([
        101,
      ]);
    }
  });

  it("looks up watch providers for the most recommended titles first, not every unique id", async () => {
    const personal = personalMovies(10);
    const crowdFavorites = Array.from({ length: 40 }, (_, index) => ({
      tmdbMovieId: 1000 + index,
      title: `Popular ${index}`,
      year: "2024",
      posterPath: null,
      overview: "",
      providers: [] as Provider[],
    }));
    const tmdb = mockTmdb({
      getMovieRecommendations: vi.fn().mockImplementation(async (movieId: number) => {
        const uncachedDune = { ...dune, providers: [] };
        if (movieId === 1) {
          return [uncachedDune, ...crowdFavorites];
        }
        return [uncachedDune];
      }),
      getWatchProviders: vi.fn().mockResolvedValue({
        ...emptyWatch,
        flatrate: [netflix],
      }),
    });

    await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      {
        ownerUserId: "user-1",
        effectiveProviders: [netflix],
        region: "US",
      },
    );

    const lookedUp = vi.mocked(tmdb.getWatchProviders).mock.calls.map(([id]) => id);
    expect(lookedUp.length).toBeLessThanOrEqual(MAX_WATCH_PROVIDER_LOOKUPS);
    expect(lookedUp[0]).toBe(101);
  });
});
