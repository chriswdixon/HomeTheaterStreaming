import { WatchlistView } from "@/components/watchlist-view";
import { loadWatchlistSafe } from "@/lib/server/load-watchlist";
import { loadHouseholdMembers } from "@/lib/server/household-members";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function SharedListPage({
  searchParams,
}: {
  searchParams: Promise<{ showInvite?: string }>;
}) {
  const { showInvite } = await searchParams;
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
      title={`${membership.household.name} · Shared list`}
      description="Vote for what to watch next. The most-voted titles rise to the top."
      initialItems={items}
      warning={warning}
      allowDrag={false}
      enableSharedVoting
      members={members}
      household={{
        name: membership.household.name,
        inviteCode: membership.household.inviteCode,
        region: membership.household.region,
      }}
      initialShowHouseholdInvite={showInvite === "1"}
    />
  );
}
