import { WatchlistView } from "@/components/watchlist-view";
import { loadRecentlyWatchedSafe } from "@/lib/server/load-watchlist";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function RecentlyWatchedPage() {
  const { userId, membership } = await requirePageMembership();
  const { items, warning } = await loadRecentlyWatchedSafe(
    userId,
    membership.householdId,
    membership.household.region,
  );

  return (
    <WatchlistView
      title="Recently watched"
      description="Titles you rated. Mark not watched to put them back on your unwatched queue."
      initialItems={items}
      showSearch={false}
      allowDrag={false}
      mode="watched"
      warning={warning}
    />
  );
}
