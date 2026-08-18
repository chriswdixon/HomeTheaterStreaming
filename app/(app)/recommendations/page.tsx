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

  try {
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
  } catch {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Recommendations</h1>
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">Could not load recommendations</h2>
          <p className="mt-2 text-muted">
            Streaming availability data is rate-limited sometimes. Refresh to try
            again.
          </p>
          <a
            href="/recommendations"
            className="mt-6 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-medium text-black"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }
}
