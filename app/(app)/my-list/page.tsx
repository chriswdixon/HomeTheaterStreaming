import { WatchlistView } from "@/components/watchlist-view";
import { loadWatchlist } from "@/lib/server/load-watchlist";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function MyListPage() {
  const { userId, membership } = await requirePageMembership();
  const items = await loadWatchlist(userId, membership.householdId, "personal");

  return (
    <WatchlistView
      list="personal"
      title="My list"
      description="Movies and series you want to watch. Drag to reorder. Recommendations use this list."
      initialItems={items}
    />
  );
}
