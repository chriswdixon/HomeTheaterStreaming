import { WatchlistView } from "@/components/watchlist-view";
import { loadWatchlistSafe } from "@/lib/server/load-watchlist";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function MyListPage() {
  const { userId, membership } = await requirePageMembership();
  const { items, warning } = await loadWatchlistSafe(
    userId,
    membership.householdId,
    "personal",
    membership.household.region,
  );

  return (
    <WatchlistView
      list="personal"
      title="My list"
      description="Movies and series you want to watch. Drag to reorder. Recommendations use this list."
      initialItems={items}
      warning={warning}
    />
  );
}
