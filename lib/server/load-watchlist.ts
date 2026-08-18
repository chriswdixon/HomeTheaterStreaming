import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { watchlistItems } from "@/db/schema";
import { availabilityForViewer } from "@/lib/availability";
import { mergeEffectiveServices } from "@/lib/effective-services";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { mapWatchlistRow } from "@/lib/server/watchlist-store";
import type { WatchlistKind } from "@/lib/watchlist";
import type { WatchlistItemView } from "@/components/watchlist-view";

export async function loadWatchlist(
  userId: string,
  householdId: string,
  list: WatchlistKind,
): Promise<WatchlistItemView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(watchlistItems)
    .where(
      list === "shared"
        ? and(
            eq(watchlistItems.householdId, householdId),
            eq(watchlistItems.list, "shared"),
          )
        : and(
            eq(watchlistItems.householdId, householdId),
            eq(watchlistItems.list, "personal"),
            eq(watchlistItems.ownerUserId, userId),
          ),
    )
    .orderBy(desc(watchlistItems.createdAt));

  const [household, personal] = await Promise.all([
    getHouseholdProviders(householdId),
    getPersonalProviders(userId, householdId),
  ]);
  const services = mergeEffectiveServices(household, personal);

  return rows.map((row) => {
    const item = mapWatchlistRow(row);
    return {
      ...item,
      availability: availabilityForViewer(
        {
          flatrate: item.cachedFlatrateProviders,
          rent: item.cachedRentProviders,
          watchUrl: item.watchUrl,
        },
        services,
      ),
    };
  });
}
