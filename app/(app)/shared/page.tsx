import { WatchlistView } from "@/components/watchlist-view";
import { loadWatchlist } from "@/lib/server/load-watchlist";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function SharedListPage() {
  const { userId, membership } = await requirePageMembership();
  const items = await loadWatchlist(userId, membership.householdId, "shared");

  return (
    <WatchlistView
      list="shared"
      title="Shared list"
      description="The household queue. Anyone here can add or remove titles."
      initialItems={items}
    />
  );
}
