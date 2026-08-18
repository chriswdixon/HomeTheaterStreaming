import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { userWatchStates, watchlistItems } from "@/db/schema";
import { jsonError, requireHousehold } from "@/lib/server/api";
import { upsertWatchState } from "@/lib/watch-state";

export async function POST(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    watchlistItemId?: string;
    rating?: number;
  };
  if (!body.watchlistItemId) return jsonError("watchlistItemId is required", 400);

  try {
    upsertWatchState([], {
      watchlistItemId: body.watchlistItemId,
      rating: body.rating ?? 0,
      watchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid rating",
      400,
    );
  }

  const db = getDb();
  const [item] = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.id, body.watchlistItemId))
    .limit(1);

  if (!item || item.householdId !== result.membership.householdId) {
    return jsonError("Title not found", 404);
  }
  if (item.list === "personal" && item.ownerUserId !== result.userId) {
    return jsonError("You can only rate titles on your list or the shared list", 403);
  }

  const [row] = await db
    .insert(userWatchStates)
    .values({
      userId: result.userId,
      householdId: result.membership.householdId,
      watchlistItemId: body.watchlistItemId,
      rating: body.rating!,
      watchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userWatchStates.userId, userWatchStates.watchlistItemId],
      set: { rating: body.rating!, watchedAt: new Date() },
    })
    .returning();

  return NextResponse.json({
    watchState: row
      ? {
          watchlistItemId: row.watchlistItemId,
          rating: row.rating,
          watchedAt: row.watchedAt.toISOString(),
        }
      : null,
  });
}

export async function DELETE(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const id = new URL(request.url).searchParams.get("watchlistItemId");
  if (!id) return jsonError("watchlistItemId is required", 400);

  const db = getDb();
  await db
    .delete(userWatchStates)
    .where(
      and(
        eq(userWatchStates.userId, result.userId),
        eq(userWatchStates.watchlistItemId, id),
      ),
    );
  return NextResponse.json({ ok: true });
}
