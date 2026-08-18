import { WatchlistView } from "@/components/watchlist-view";
import { loadWatchlistSafe } from "@/lib/server/load-watchlist";
import { loadHouseholdMembers } from "@/lib/server/household-members";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function SharedListPage() {
  const { userId, membership } = await requirePageMembership();
  const [{ items, warning }, members] = await Promise.all([
    loadWatchlistSafe(
      userId,
      membership.householdId,
      "shared",
      membership.household.region,
    ),
    loadHouseholdMembers(membership.householdId, userId),
  ]);

  return (
    <WatchlistView
      list="shared"
      title="Shared list"
      description="The household queue. Anyone here can add, reorder, or remove titles."
      initialItems={items}
      warning={warning}
      members={members}
      household={{
        name: membership.household.name,
        inviteCode: membership.household.inviteCode,
        region: membership.household.region,
      }}
    />
  );
}
