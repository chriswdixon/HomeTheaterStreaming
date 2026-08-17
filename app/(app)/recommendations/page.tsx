import { RecommendationsView } from "@/components/recommendations-view";
import { mergeEffectiveServices } from "@/lib/effective-services";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { requirePageMembership } from "@/lib/server/page-session";
import { getRecommendationPayload } from "@/lib/server/watchlist-actions";
import { createDbWatchlistStore } from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";

export default async function RecommendationsPage() {
  const { userId, membership } = await requirePageMembership();
  const [household, personal] = await Promise.all([
    getHouseholdProviders(membership.householdId),
    getPersonalProviders(userId, membership.householdId),
  ]);

  const payload = await getRecommendationPayload(
    {
      tmdb: createTmdbClient(),
      store: createDbWatchlistStore(membership.householdId),
    },
    {
      ownerUserId: userId,
      effectiveProviders: mergeEffectiveServices(household, personal),
      region: membership.household.region,
    },
  );

  return <RecommendationsView initial={payload} />;
}
