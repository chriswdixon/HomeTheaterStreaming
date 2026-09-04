import { availabilityForViewer } from "@/lib/availability";
import { mergeEffectiveServices } from "@/lib/effective-services";
import { parseListBackup } from "@/lib/list-backup";
import { jsonError, jsonOk, requireHousehold } from "@/lib/server/api";
import { importListBackup } from "@/lib/server/import-list-backup";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { createDbWatchlistStore } from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";
import type { WatchlistKind } from "@/lib/watchlist";

function parseList(value: unknown): WatchlistKind | null {
  if (value === "personal" || value === "shared") return value;
  return null;
}

export async function POST(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    list?: WatchlistKind;
    backup?: unknown;
  };

  const list = parseList(body.list);
  if (!list) return jsonError("list must be personal or shared", 400);

  const parsed = parseListBackup(body.backup);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const imported = await importListBackup(
    {
      tmdb: createTmdbClient(),
      store: createDbWatchlistStore(result.membership.householdId),
    },
    {
      list,
      ownerUserId: list === "personal" ? result.userId : null,
      addedByUserId: result.userId,
      region: result.membership.household.region,
      backup: parsed.backup,
    },
  );

  const [household, personal] = await Promise.all([
    getHouseholdProviders(result.membership.householdId),
    getPersonalProviders(result.userId, result.membership.householdId),
  ]);
  const viewerServices = mergeEffectiveServices(household, personal);

  return jsonOk({
    added: imported.added,
    skipped: imported.skipped,
    failed: imported.failed,
    items: imported.items.map((item) => ({
      ...item,
      availability: availabilityForViewer(
        {
          flatrate: item.cachedFlatrateProviders,
          rent: item.cachedRentProviders,
          watchUrl: item.watchUrl,
        },
        viewerServices,
        {
          title: item.title,
          tmdbMovieId: item.tmdbMovieId,
          mediaType: item.mediaType,
        },
      ),
      watchState: null,
      ...(list === "shared"
        ? { voteCount: 0, votedByCurrentUser: false }
        : {}),
    })),
  });
}
