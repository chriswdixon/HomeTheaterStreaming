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
    getTitleRecommendations: vi.fn().mockResolvedValue([dune]),
    getTitleMeta: vi.fn().mockResolvedValue({
      genres: [],
      keywords: [],
      collectionId: null,
      collectionName: null,
    }),
    getCollectionParts: vi.fn().mockResolvedValue([]),
    discoverByKeyword: vi.fn().mockResolvedValue([]),
    getMoviesByIds: vi.fn().mockResolvedValue([]),
    listWatchProviders: vi.fn(),
    ...overrides,
  };
}

function personalMovies(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    list: "personal" as const,
    ownerUserId: "user-1",
    mediaType: "movie" as const,
    tmdbMovieId: index + 1,
    title: `Movie ${index}`,
    year: "2020",
    posterPath: null,
    overview: "",
    genres: [],
    keywords: [],
    collectionId: null,
    collectionName: null,
    sortOrder: index,
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
        mediaType: "movie",
        tmdbMovieId: 42,
        title: "Heat",
        year: "1995",
        posterPath: null,
        overview: "",
        genres: [],
        keywords: [],
        collectionId: null,
        collectionName: null,
        sortOrder: 0,
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
    expect(tmdb.getWatchProviders).toHaveBeenCalledWith(550, "US", "movie");
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
        region: "US",
      },
    );

    expect(payload).toEqual({
      unlocked: false,
      count: 9,
      needed: 10,
    });
  });

  it("groups recommendations by franchise, including titles not on subscribed services", async () => {
    const personal = personalMovies(10).map((item, index) =>
      index < 2
        ? {
            ...item,
            collectionId: 10,
            collectionName: "John Wick Collection",
          }
        : item,
    );
    const chapter4: RecommendedMovie = {
      tmdbMovieId: 245891,
      title: "John Wick: Chapter 4",
      year: "2023",
      posterPath: "/jw4.jpg",
      overview: "Guns",
      providers: [],
    };
    const tmdb = mockTmdb({
      getCollectionParts: vi.fn().mockResolvedValue([chapter4]),
      getWatchProviders: vi.fn().mockResolvedValue({
        ...emptyWatch,
        flatrate: [{ tmdbProviderId: 15, name: "Hulu", logoPath: "/hulu.png" }],
      }),
    });

    const payload = await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      {
        ownerUserId: "user-1",
        region: "US",
      },
    );

    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(payload.watchOrderGroups).toEqual([]);
      expect(payload.affinityGroups.map((group) => group.name)).toEqual([
        "John Wick Collection",
      ]);
      expect(
        payload.affinityGroups[0]?.movies.map((movie) => movie.tmdbMovieId),
      ).toEqual([245891]);
    }
  });

  it("keeps franchise recommendations when some TMDB watch-provider lookups fail", async () => {
    const personal = personalMovies(10).map((item, index) =>
      index < 2
        ? {
            ...item,
            collectionId: 10,
            collectionName: "John Wick Collection",
          }
        : item,
    );
    const flop: RecommendedMovie = {
      tmdbMovieId: 14831,
      title: "The Flop",
      year: "1980",
      posterPath: null,
      overview: "",
      providers: [],
    };
    const tmdb = mockTmdb({
      getCollectionParts: vi.fn().mockResolvedValue([flop]),
      getWatchProviders: vi.fn().mockRejectedValue(
        new Error("TMDB request failed (429) for /movie/14831/watch/providers"),
      ),
    });

    const payload = await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      {
        ownerUserId: "user-1",
        region: "US",
      },
    );

    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(
        payload.affinityGroups[0]?.movies.map((movie) => movie.tmdbMovieId),
      ).toEqual([14831]);
    }
  });

  it("looks up watch providers for franchise titles, not every similar-movie id", async () => {
    const personal = personalMovies(10).map((item, index) =>
      index < 2
        ? {
            ...item,
            collectionId: 10,
            collectionName: "John Wick Collection",
          }
        : item,
    );
    const parts = Array.from({ length: 12 }, (_, index) => ({
      tmdbMovieId: 2000 + index,
      title: `Wick ${index}`,
      year: "2024",
      posterPath: null,
      overview: "",
      providers: [] as Provider[],
    }));
    const tmdb = mockTmdb({
      getTitleRecommendations: vi.fn().mockResolvedValue(
        Array.from({ length: 40 }, (_, index) => ({
          tmdbMovieId: 1000 + index,
          title: `Popular ${index}`,
          year: "2024",
          posterPath: null,
          overview: "",
          providers: [] as Provider[],
        })),
      ),
      getCollectionParts: vi.fn().mockResolvedValue(parts),
      getWatchProviders: vi.fn().mockResolvedValue({
        ...emptyWatch,
        flatrate: [netflix],
      }),
    });

    await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      {
        ownerUserId: "user-1",
        region: "US",
      },
    );

    const lookedUp = vi.mocked(tmdb.getWatchProviders).mock.calls.map(([id]) => id);
    expect(lookedUp.length).toBeLessThanOrEqual(MAX_WATCH_PROVIDER_LOOKUPS);
    expect(lookedUp.every((id) => id >= 2000 && id < 2012)).toBe(true);
  });

  it("shows a numbered MCU path when three or more personal titles match", async () => {
    const mcuKeyword = {
      tmdbKeywordId: 180547,
      name: "marvel cinematic universe",
    };
    const mcuIds = [1726, 24428, 299534];
    const personal = personalMovies(10).map((item, index) =>
      index < 3
        ? {
            ...item,
            tmdbMovieId: mcuIds[index]!,
            title: `MCU ${index}`,
            keywords: [mcuKeyword],
          }
        : item,
    );
    const tmdb = mockTmdb({
      getMoviesByIds: vi.fn().mockImplementation(async (ids: number[]) =>
        ids.map((id) => ({
          tmdbMovieId: id,
          mediaType: "movie" as const,
          title: `Movie ${id}`,
          year: "2012",
          posterPath: null,
          overview: "",
        })),
      ),
    });

    const payload = await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      { ownerUserId: "user-1", region: "US" },
    );

    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(payload.watchOrderGroups).toHaveLength(1);
      expect(payload.watchOrderGroups[0]?.name).toBe("Marvel Cinematic Universe");
      expect(payload.watchOrderGroups[0]?.orderLabel).toBe("first-watch");
      expect(payload.watchOrderGroups[0]?.movies[0]?.tmdbMovieId).toBe(1726);
      expect(payload.watchOrderGroups[0]?.movies[0]?.order).toBe(1);
      expect(
        payload.watchOrderGroups[0]?.movies.find((movie) => movie.tmdbMovieId === 1726)
          ?.onList,
      ).toBe(true);
      expect(
        payload.watchOrderGroups[0]?.movies.find((movie) => movie.tmdbMovieId === 24428)
          ?.onList,
      ).toBe(true);
      expect(
        payload.watchOrderGroups[0]?.movies.find((movie) => movie.tmdbMovieId === 1724)
          ?.onList,
      ).toBe(false);
      expect(payload.affinityGroups).toEqual([]);
    }
  });

  it("does not show a watch path for only two franchise titles", async () => {
    const mcuKeyword = {
      tmdbKeywordId: 180547,
      name: "marvel cinematic universe",
    };
    const personal = personalMovies(10).map((item, index) =>
      index < 2
        ? { ...item, keywords: [mcuKeyword] }
        : item,
    );
    const discoverHit = {
      tmdbMovieId: 999,
      mediaType: "movie" as const,
      title: "Extra MCU",
      year: "2024",
      posterPath: null,
      overview: "",
    };
    const tmdb = mockTmdb({
      discoverByKeyword: vi.fn().mockResolvedValue([discoverHit]),
    });

    const payload = await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      { ownerUserId: "user-1", region: "US" },
    );

    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(payload.watchOrderGroups).toEqual([]);
      expect(payload.affinityGroups[0]?.movies.map((movie) => movie.tmdbMovieId)).toEqual([
        999,
      ]);
    }
  });

  it("hides collection leftovers that overlap a franchise watch path", async () => {
    const mcuKeyword = {
      tmdbKeywordId: 180547,
      name: "marvel cinematic universe",
    };
    const mcuIds = [1726, 24428, 299534];
    const personal = personalMovies(10).map((item, index) => {
      if (index < 3) {
        return {
          ...item,
          tmdbMovieId: mcuIds[index]!,
          keywords: [mcuKeyword],
          collectionId: 10,
          collectionName: "Avengers Collection",
        };
      }
      return item;
    });
    const tmdb = mockTmdb({
      getMoviesByIds: vi.fn().mockImplementation(async (ids: number[]) =>
        ids.map((id) => ({
          tmdbMovieId: id,
          mediaType: "movie" as const,
          title: `Movie ${id}`,
          year: "2012",
          posterPath: null,
          overview: "",
        })),
      ),
      getCollectionParts: vi.fn().mockResolvedValue([
        {
          tmdbMovieId: 24428,
          mediaType: "movie" as const,
          title: "Avengers",
          year: "2012",
          posterPath: null,
          overview: "",
        },
      ]),
    });

    const payload = await getRecommendationPayload(
      { tmdb, store: memoryStore(personal) },
      { ownerUserId: "user-1", region: "US" },
    );

    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(payload.watchOrderGroups).toHaveLength(1);
      expect(payload.affinityGroups).toEqual([]);
    }
  });
});
