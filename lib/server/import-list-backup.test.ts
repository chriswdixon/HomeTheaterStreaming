import { describe, expect, it, vi } from "vitest";
import type { TmdbClient } from "../tmdb";
import type { ListBackupFile } from "../list-backup";
import type { StoredWatchlistItem, WatchlistStore } from "./watchlist-actions";
import { importListBackup } from "./import-list-backup";

const emptyWatch = {
  flatrate: [],
  rent: [],
  buy: [],
  watchUrl: null,
};

function mockTmdb(overrides: Partial<TmdbClient> = {}): TmdbClient {
  return {
    searchMovies: vi.fn(),
    getWatchProviders: vi.fn().mockResolvedValue(emptyWatch),
    getMovieRecommendations: vi.fn().mockResolvedValue([]),
    getTitleRecommendations: vi.fn().mockResolvedValue([]),
    getTitleMeta: vi.fn().mockResolvedValue({
      genres: [],
      keywords: [],
      collectionId: null,
      collectionName: null,
      contentRating: null,
    }),
    getTitleDetails: vi.fn().mockResolvedValue(null),
    getContentRating: vi.fn().mockResolvedValue(null),
    getCollectionParts: vi.fn().mockResolvedValue([]),
    discoverByKeyword: vi.fn().mockResolvedValue([]),
    getMoviesByIds: vi.fn().mockResolvedValue([]),
    getTopRatedMovies: vi.fn().mockResolvedValue([]),
    listWatchProviders: vi.fn(),
    ...overrides,
  };
}

function stored(partial: Partial<StoredWatchlistItem> & Pick<StoredWatchlistItem, "tmdbMovieId" | "title">): StoredWatchlistItem {
  return {
    id: partial.id ?? `id-${partial.tmdbMovieId}`,
    list: partial.list ?? "personal",
    ownerUserId: partial.ownerUserId ?? "user-1",
    mediaType: partial.mediaType ?? "movie",
    tmdbMovieId: partial.tmdbMovieId,
    title: partial.title,
    year: partial.year ?? "1999",
    posterPath: partial.posterPath ?? null,
    overview: partial.overview ?? "",
    genres: [],
    keywords: [],
    collectionId: null,
    collectionName: null,
    contentRating: null,
    folderName: partial.folderName ?? null,
    folderOrder: partial.folderOrder ?? null,
    sortOrder: partial.sortOrder ?? 0,
    cachedFlatrateProviders: [],
    cachedRentProviders: [],
    watchUrl: null,
    addedByUserId: partial.addedByUserId ?? "user-1",
  };
}

function memoryStore(seed: StoredWatchlistItem[] = []): WatchlistStore & {
  items: StoredWatchlistItem[];
} {
  const items = [...seed];
  return {
    items,
    async listItems() {
      return items;
    },
    async insertItem(item) {
      const created = { id: `new-${item.tmdbMovieId}`, ...item };
      items.push(created);
      return created;
    },
    async updateItem(id, patch) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) throw new Error("not found");
      items[index] = { ...items[index]!, ...patch };
      return items[index]!;
    },
  };
}

function backup(items: ListBackupFile["items"]): ListBackupFile {
  return {
    format: "screenstack-list",
    version: 1,
    exportedAt: "2026-09-04T21:26:00.000Z",
    list: "personal",
    name: "My List",
    items,
  };
}

describe("importListBackup", () => {
  it("adds missing titles and skips duplicates", async () => {
    const store = memoryStore([
      stored({ tmdbMovieId: 603, title: "The Matrix" }),
    ]);

    const result = await importListBackup(
      { tmdb: mockTmdb(), store },
      {
        list: "personal",
        ownerUserId: "user-1",
        addedByUserId: "user-1",
        region: "US",
        backup: backup([
          {
            mediaType: "movie",
            tmdbMovieId: 603,
            title: "The Matrix",
            year: "1999",
            posterPath: null,
            overview: "",
            folderName: null,
          },
          {
            mediaType: "tv",
            tmdbMovieId: 1396,
            title: "Breaking Bad",
            year: "2008",
            posterPath: null,
            overview: "",
            folderName: null,
          },
        ]),
      },
    );

    expect(result).toMatchObject({
      added: 1,
      skipped: 1,
      failed: 0,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      tmdbMovieId: 1396,
      title: "Breaking Bad",
    });
    expect(store.items.map((item) => item.tmdbMovieId)).toEqual([603, 1396]);
  });

  it("restores folderName on newly added titles only", async () => {
    const store = memoryStore([
      stored({ tmdbMovieId: 11, title: "Star Wars", folderName: null }),
    ]);

    const result = await importListBackup(
      { tmdb: mockTmdb(), store },
      {
        list: "personal",
        ownerUserId: "user-1",
        addedByUserId: "user-1",
        region: "US",
        backup: backup([
          {
            mediaType: "movie",
            tmdbMovieId: 11,
            title: "Star Wars",
            year: "1977",
            posterPath: null,
            overview: "",
            folderName: "Star Wars",
          },
          {
            mediaType: "movie",
            tmdbMovieId: 1891,
            title: "The Empire Strikes Back",
            year: "1980",
            posterPath: null,
            overview: "",
            folderName: "Star Wars",
          },
        ]),
      },
    );

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(store.items.find((item) => item.tmdbMovieId === 11)?.folderName).toBe(
      null,
    );
    expect(
      store.items.find((item) => item.tmdbMovieId === 1891)?.folderName,
    ).toBe("Star Wars");
  });

  it("continues when one title fails to add", async () => {
    const tmdb = mockTmdb({
      getTitleMeta: vi.fn().mockImplementation((id: number) => {
        if (id === 1) throw new Error("TMDB down");
        return {
          genres: [],
          keywords: [],
          collectionId: null,
          collectionName: null,
          contentRating: null,
        };
      }),
    });
    const store = memoryStore();

    const result = await importListBackup(
      { tmdb, store },
      {
        list: "personal",
        ownerUserId: "user-1",
        addedByUserId: "user-1",
        region: "US",
        backup: backup([
          {
            mediaType: "movie",
            tmdbMovieId: 1,
            title: "Fails",
            year: "2020",
            posterPath: null,
            overview: "",
            folderName: null,
          },
          {
            mediaType: "movie",
            tmdbMovieId: 2,
            title: "Works",
            year: "2021",
            posterPath: null,
            overview: "",
            folderName: null,
          },
        ]),
      },
    );

    expect(result).toMatchObject({ added: 1, skipped: 0, failed: 1 });
    expect(result.items[0]?.title).toBe("Works");
  });
});
