import { WatchlistView } from "@/components/watchlist-view";
import { loadRecentlyWatched } from "@/lib/server/load-watchlist";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function RecentlyWatchedPage() {
  const { userId, membership } = await requirePageMembership();
  const items = await loadRecentlyWatched(userId, membership.householdId);

  return (
    <WatchlistView
      title="Recently watched"
      description="Titles you rated. Mark not watched to put them back on your unwatched queue."
      initialItems={items}
      showSearch={false}
      allowDrag={false}
      mode="watched"
    />
  );
}
