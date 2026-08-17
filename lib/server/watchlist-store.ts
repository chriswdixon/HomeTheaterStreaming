import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { watchlistItems } from "@/db/schema";
import type { Provider } from "@/lib/effective-services";
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
    tmdbMovieId: row.tmdbMovieId,
    title: row.title,
    year: row.year,
    posterPath: row.posterPath,
    overview: row.overview ?? "",
    cachedFlatrateProviders: row.cachedFlatrateProviders ?? [],
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
        .where(eq(watchlistItems.householdId, householdId));
      return rows.map(mapWatchlistRow);
    },
    async insertItem(item) {
      const [row] = await db
        .insert(watchlistItems)
        .values({
          householdId,
          list: item.list,
          ownerUserId: item.ownerUserId,
          tmdbMovieId: item.tmdbMovieId,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          overview: item.overview,
          cachedFlatrateProviders: item.cachedFlatrateProviders,
          addedByUserId: item.addedByUserId,
        })
        .returning();

      if (!row) {
        throw new Error("Could not save watchlist item");
      }

      return mapWatchlistRow(row);
    },
  };
}

export async function refreshHouseholdAvailability(
  householdId: string,
  region: string,
) {
  const db = getDb();
  const tmdb = createTmdbClient();
  const rows = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.householdId, householdId));

  await Promise.all(
    rows.map(async (row) => {
      const providers: Provider[] = await tmdb.getWatchProviders(
        row.tmdbMovieId,
        region,
      );
      await db
        .update(watchlistItems)
        .set({ cachedFlatrateProviders: providers })
        .where(
          and(
            eq(watchlistItems.id, row.id),
            eq(watchlistItems.householdId, householdId),
          ),
        );
    }),
  );
}
