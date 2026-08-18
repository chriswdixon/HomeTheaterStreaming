import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { watchlistItems } from "@/db/schema";
import type {
  StoredWatchlistItem,
  WatchlistStore,
} from "@/lib/server/watchlist-actions";
import type { WatchlistKind } from "@/lib/watchlist";
import { createTmdbClient } from "@/lib/tmdb";

export function mapWatchlistRow(
  row: typeof watchlistItems.$inferSelect,
): StoredWatchlistItem {
  return {
    id: row.id,
    list: row.list as WatchlistKind,
    ownerUserId: row.ownerUserId,
    mediaType: row.mediaType === "tv" ? "tv" : "movie",
    tmdbMovieId: row.tmdbMovieId,
    title: row.title,
    year: row.year,
    posterPath: row.posterPath,
    overview: row.overview ?? "",
    genres: row.genres ?? [],
    keywords: row.keywords ?? [],
    collectionId: row.collectionId,
    collectionName: row.collectionName,
    folderName: row.folderName ?? null,
    folderOrder: row.folderOrder ?? null,
    sortOrder: row.sortOrder,
    cachedFlatrateProviders: row.cachedFlatrateProviders ?? [],
    cachedRentProviders: row.cachedRentProviders ?? [],
    watchUrl: row.watchUrl ?? null,
    addedByUserId: row.addedByUserId,
  };
}

export function createDbWatchlistStore(householdId: string): WatchlistStore {
  const db = getDb();

  return {
    async listItems() {
      const rows = await db
        .select()
        .from(watchlistItems)
        .where(eq(watchlistItems.householdId, householdId))
        .orderBy(asc(watchlistItems.sortOrder), desc(watchlistItems.createdAt));
      let hydrated = rows;
      try {
        hydrated = await backfillMissingTitleMeta(rows);
      } catch {
        // Keep stored rows when TMDB backfill fails.
      }
      return hydrated.map(mapWatchlistRow);
    },
    async insertItem(item) {
      const [row] = await db
        .insert(watchlistItems)
        .values({
          householdId,
          list: item.list,
          ownerUserId: item.ownerUserId,
          mediaType: item.mediaType,
          tmdbMovieId: item.tmdbMovieId,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          overview: item.overview,
          genres: item.genres,
          keywords: item.keywords,
          collectionId: item.collectionId,
          collectionName: item.collectionName,
          folderName: item.folderName,
          folderOrder: item.folderOrder,
          sortOrder: item.sortOrder,
          cachedFlatrateProviders: item.cachedFlatrateProviders,
          cachedRentProviders: item.cachedRentProviders,
          watchUrl: item.watchUrl,
          addedByUserId: item.addedByUserId,
        })
        .returning();

      if (!row) {
        throw new Error("Could not save watchlist item");
      }

      return mapWatchlistRow(row);
    },
    async updateItem(id, patch) {
      const [row] = await db
        .update(watchlistItems)
        .set({
          ...(patch.folderName !== undefined
            ? { folderName: patch.folderName }
            : {}),
          ...(patch.folderOrder !== undefined
            ? { folderOrder: patch.folderOrder }
            : {}),
          ...(patch.sortOrder !== undefined
            ? { sortOrder: patch.sortOrder }
            : {}),
          ...(patch.genres !== undefined ? { genres: patch.genres } : {}),
          ...(patch.keywords !== undefined ? { keywords: patch.keywords } : {}),
          ...(patch.collectionId !== undefined
            ? { collectionId: patch.collectionId }
            : {}),
          ...(patch.collectionName !== undefined
            ? { collectionName: patch.collectionName }
            : {}),
        })
        .where(
          and(
            eq(watchlistItems.id, id),
            eq(watchlistItems.householdId, householdId),
          ),
        )
        .returning();

      if (!row) {
        throw new Error("Could not update watchlist item");
      }

      return mapWatchlistRow(row);
    },
  };
}

export async function saveWatchlistOrder(
  householdId: string,
  ids: string[],
) {
  const db = getDb();
  await Promise.all(
    ids.map((id, index) =>
      db
        .update(watchlistItems)
        .set({ sortOrder: index })
        .where(
          and(
            eq(watchlistItems.id, id),
            eq(watchlistItems.householdId, householdId),
          ),
        ),
    ),
  );
}

function watchCacheUnchanged(
  row: typeof watchlistItems.$inferSelect,
  watch: {
    flatrate: StoredWatchlistItem["cachedFlatrateProviders"];
    rent: StoredWatchlistItem["cachedRentProviders"];
    watchUrl: string | null;
  },
) {
  return (
    JSON.stringify(row.cachedFlatrateProviders ?? []) ===
      JSON.stringify(watch.flatrate) &&
    JSON.stringify(row.cachedRentProviders ?? []) === JSON.stringify(watch.rent) &&
    (row.watchUrl ?? null) === watch.watchUrl
  );
}

export async function syncItemWatchCache(
  row: typeof watchlistItems.$inferSelect,
  region: string,
): Promise<typeof watchlistItems.$inferSelect> {
  const db = getDb();
  const tmdb = createTmdbClient();
  const mediaType = row.mediaType === "tv" ? "tv" : "movie";
  let watch;
  try {
    watch = await tmdb.getWatchProviders(row.tmdbMovieId, region, mediaType);
  } catch {
    return row;
  }
  if (watchCacheUnchanged(row, watch)) return row;

  const [updated] = await db
    .update(watchlistItems)
    .set({
      cachedFlatrateProviders: watch.flatrate,
      cachedRentProviders: watch.rent,
      watchUrl: watch.watchUrl,
    })
    .where(
      and(
        eq(watchlistItems.id, row.id),
        eq(watchlistItems.householdId, row.householdId),
      ),
    )
    .returning();

  return updated ?? row;
}

export async function refreshHouseholdAvailability(
  householdId: string,
  region: string,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.householdId, householdId));

  await Promise.all(
    rows.map(async (row) => {
      try {
        await syncItemWatchCache(row, region);
      } catch {
        // Keep going when one title cannot refresh.
      }
    }),
  );
}

export async function backfillMissingTitleMeta(
  rows: (typeof watchlistItems.$inferSelect)[],
): Promise<(typeof watchlistItems.$inferSelect)[]> {
  const missing = rows.filter((row) => (row.genres ?? []).length === 0);
  if (missing.length === 0) return rows;

  const db = getDb();
  const tmdb = createTmdbClient();
  const updated = new Map<string, (typeof watchlistItems.$inferSelect)>();
  let next = 0;

  async function worker() {
    while (next < missing.length) {
      const row = missing[next++];
      if (!row) return;
      try {
        const mediaType = row.mediaType === "tv" ? "tv" : "movie";
        const meta = await tmdb.getTitleMeta(row.tmdbMovieId, mediaType);
        const [saved] = await db
          .update(watchlistItems)
          .set({
            genres: meta.genres,
            keywords: meta.keywords,
            collectionId: meta.collectionId,
            collectionName: meta.collectionName,
          })
          .where(eq(watchlistItems.id, row.id))
          .returning();
        if (saved) updated.set(row.id, saved);
      } catch {
        // Skip titles TMDB will not describe.
      }
    }
  }

  await Promise.all([worker(), worker()]);
  return rows.map((row) => updated.get(row.id) ?? row);
}
