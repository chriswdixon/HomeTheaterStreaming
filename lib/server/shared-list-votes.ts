import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sharedListVotes, watchlistItems } from "@/db/schema";

export type SharedListVoteSummary = {
  voteCount: number;
  votedByCurrentUser: boolean;
};

export async function loadSharedListVoteSummaries(
  userId: string,
  itemIds: string[],
): Promise<Map<string, SharedListVoteSummary>> {
  if (itemIds.length === 0) return new Map();

  const db = getDb();
  const [counts, userVotes] = await Promise.all([
    db
      .select({
        watchlistItemId: sharedListVotes.watchlistItemId,
        voteCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(sharedListVotes)
      .where(inArray(sharedListVotes.watchlistItemId, itemIds))
      .groupBy(sharedListVotes.watchlistItemId),
    db
      .select({ watchlistItemId: sharedListVotes.watchlistItemId })
      .from(sharedListVotes)
      .where(
        and(
          eq(sharedListVotes.userId, userId),
          inArray(sharedListVotes.watchlistItemId, itemIds),
        ),
      ),
  ]);

  const votedIds = new Set(userVotes.map((row) => row.watchlistItemId));
  const summaries = new Map<string, SharedListVoteSummary>();

  for (const id of itemIds) {
    summaries.set(id, { voteCount: 0, votedByCurrentUser: votedIds.has(id) });
  }
  for (const row of counts) {
    summaries.set(row.watchlistItemId, {
      voteCount: row.voteCount,
      votedByCurrentUser: votedIds.has(row.watchlistItemId),
    });
  }

  return summaries;
}

export async function toggleSharedListVote(
  userId: string,
  householdId: string,
  watchlistItemId: string,
): Promise<SharedListVoteSummary> {
  const db = getDb();
  const [item] = await db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.id, watchlistItemId),
        eq(watchlistItems.householdId, householdId),
        eq(watchlistItems.list, "shared"),
      ),
    )
    .limit(1);

  if (!item) {
    throw new Error("Shared list title not found");
  }

  const [existing] = await db
    .select({ watchlistItemId: sharedListVotes.watchlistItemId })
    .from(sharedListVotes)
    .where(
      and(
        eq(sharedListVotes.watchlistItemId, watchlistItemId),
        eq(sharedListVotes.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(sharedListVotes)
      .where(
        and(
          eq(sharedListVotes.watchlistItemId, watchlistItemId),
          eq(sharedListVotes.userId, userId),
        ),
      );
  } else {
    await db.insert(sharedListVotes).values({
      watchlistItemId,
      userId,
    });
  }

  const summaries = await loadSharedListVoteSummaries(userId, [watchlistItemId]);
  return summaries.get(watchlistItemId) ?? { voteCount: 0, votedByCurrentUser: false };
}
