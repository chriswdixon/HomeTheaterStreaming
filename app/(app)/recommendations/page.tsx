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

  const [payload, household, personal] = await Promise.all([
    getRecommendationPayload(
      {
        tmdb: createTmdbClient(),
        store: createDbWatchlistStore(membership.householdId),
      },
      {
        ownerUserId: userId,
        region: membership.household.region,
      },
    ),
    getHouseholdProviders(membership.householdId),
    getPersonalProviders(userId, membership.householdId),
  ]);

  return (
    <RecommendationsView
      initial={payload}
      viewerServices={mergeEffectiveServices(household, personal)}
    />
  );
}
