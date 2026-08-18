import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userWatchStates, watchlistItems } from "@/db/schema";
import { availabilityForViewer } from "@/lib/availability";
import { mergeEffectiveServices } from "@/lib/effective-services";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import {
  backfillMissingTitleMeta,
  mapWatchlistRow,
} from "@/lib/server/watchlist-store";
import type { WatchState } from "@/lib/watch-state";
import { recentlyWatchedItems } from "@/lib/watch-state";
import type { WatchlistKind } from "@/lib/watchlist";
import type { WatchlistItemView } from "@/components/watchlist-view";

async function servicesFor(userId: string, householdId: string) {
  const [household, personal] = await Promise.all([
    getHouseholdProviders(householdId),
    getPersonalProviders(userId, householdId),
  ]);
  return mergeEffectiveServices(household, personal);
}

function withAvailability(
  item: ReturnType<typeof mapWatchlistRow>,
  services: Awaited<ReturnType<typeof servicesFor>>,
  watchState: WatchState | null,
): WatchlistItemView {
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
    watchState,
  };
}

export async function loadWatchStates(
  userId: string,
  itemIds: string[],
): Promise<WatchState[]> {
  if (itemIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(userWatchStates)
    .where(eq(userWatchStates.userId, userId));
  const allowed = new Set(itemIds);
  return rows
    .filter((row) => allowed.has(row.watchlistItemId))
    .map((row) => ({
      watchlistItemId: row.watchlistItemId,
      rating: row.rating,
      watchedAt: row.watchedAt.toISOString(),
    }));
}

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
    .orderBy(asc(watchlistItems.sortOrder), desc(watchlistItems.createdAt));

  const hydrated = await backfillMissingTitleMeta(rows);

  const [services, states] = await Promise.all([
    servicesFor(userId, householdId),
    loadWatchStates(
      userId,
      hydrated.map((row) => row.id),
    ),
  ]);
  const stateById = new Map(states.map((state) => [state.watchlistItemId, state]));

  return hydrated.map((row) =>
    withAvailability(
      mapWatchlistRow(row),
      services,
      stateById.get(row.id) ?? null,
    ),
  );
}

export async function loadRecentlyWatched(
  userId: string,
  householdId: string,
): Promise<WatchlistItemView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.householdId, householdId));

  const visible = rows.filter(
    (row) =>
      row.list === "shared" ||
      (row.list === "personal" && row.ownerUserId === userId),
  );
  const items = visible.map(mapWatchlistRow);
  const [services, states] = await Promise.all([
    servicesFor(userId, householdId),
    loadWatchStates(
      userId,
      items.map((item) => item.id),
    ),
  ]);
  const stateById = new Map(states.map((state) => [state.watchlistItemId, state]));
  return recentlyWatchedItems(items, states).map((item) =>
    withAvailability(item, services, stateById.get(item.id) ?? null),
  );
}
