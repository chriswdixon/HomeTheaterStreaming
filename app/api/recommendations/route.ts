import { jsonOk, requireHousehold } from "@/lib/server/api";
import { getRecommendationPayload } from "@/lib/server/watchlist-actions";
import { createDbWatchlistStore } from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";

export async function GET() {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const payload = await getRecommendationPayload(
    {
      tmdb: createTmdbClient(),
      store: createDbWatchlistStore(result.membership.householdId),
    },
    {
      ownerUserId: result.userId,
      region: result.membership.household.region,
    },
  );

  return jsonOk(payload);
}
