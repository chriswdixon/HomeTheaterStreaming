import { WatchlistView } from "@/components/watchlist-view";
import { mergeEffectiveServices } from "@/lib/effective-services";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import {
  loadSharedItemKeys,
  loadWatchlistSafe,
} from "@/lib/server/load-watchlist";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function MyListPage() {
  const { userId, membership } = await requirePageMembership();
  const [result, household, personal, sharedItemKeys] = await Promise.all([
    loadWatchlistSafe(
      userId,
      membership.householdId,
      "personal",
      membership.household.region,
    ),
    getHouseholdProviders(membership.householdId),
    getPersonalProviders(userId, membership.householdId),
    loadSharedItemKeys(membership.householdId),
  ]);

  return (
    <WatchlistView
      list="personal"
      title="My list"
      description="Movies and series you want to watch. Drag to reorder. Recommendations use this list."
      initialItems={result.items}
      initialSharedItemKeys={sharedItemKeys}
      warning={result.warning}
      viewerServices={mergeEffectiveServices(household, personal)}
      showServiceFilter
    />
  );
}
