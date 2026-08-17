import { NextResponse } from "next/server";
import { mergeEffectiveServices } from "@/lib/effective-services";
import { jsonError, requireHousehold } from "@/lib/server/api";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { getRecommendationPayload } from "@/lib/server/watchlist-actions";
import { createDbWatchlistStore } from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";

export async function GET() {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const [household, personal] = await Promise.all([
    getHouseholdProviders(result.membership.householdId),
    getPersonalProviders(result.userId, result.membership.householdId),
  ]);

  try {
    const payload = await getRecommendationPayload(
      {
        tmdb: createTmdbClient(),
        store: createDbWatchlistStore(result.membership.householdId),
      },
      {
        ownerUserId: result.userId,
        effectiveProviders: mergeEffectiveServices(household, personal),
        region: result.membership.household.region,
      },
    );
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load recommendations";
    return jsonError(message, 502);
  }
}
