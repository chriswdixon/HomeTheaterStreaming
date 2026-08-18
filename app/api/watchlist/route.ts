import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlistItems } from "@/db/schema";
import { availabilityForViewer } from "@/lib/availability";
import { mergeEffectiveServices } from "@/lib/effective-services";
import { jsonError, requireHousehold } from "@/lib/server/api";
import { loadWatchlist } from "@/lib/server/load-watchlist";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { addWatchlistItem } from "@/lib/server/watchlist-actions";
import {
  createDbWatchlistStore,
  saveWatchlistOrder,
} from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";
import type { MediaType } from "@/lib/media";
import type { WatchlistKind } from "@/lib/watchlist";

function parseList(value: string | null): WatchlistKind | null {
  if (value === "personal" || value === "shared") return value;
  return null;
}

export async function GET(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const list = parseList(new URL(request.url).searchParams.get("list"));
  if (!list) return jsonError("list must be personal or shared", 400);

  const items = await loadWatchlist(
    result.userId,
    result.membership.householdId,
    list,
  );
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    list?: WatchlistKind;
    movie?: {
      tmdbMovieId: number;
      mediaType?: MediaType;
      title: string;
      year: string | null;
      posterPath: string | null;
      overview: string;
    };
  };

  const list = parseList(body.list ?? null);
  if (!list) return jsonError("list must be personal or shared", 400);
  if (!body.movie?.tmdbMovieId || !body.movie.title) {
    return jsonError("movie is required", 400);
  }

  const added = await addWatchlistItem(
    {
      tmdb: createTmdbClient(),
      store: createDbWatchlistStore(result.membership.householdId),
    },
    {
      list,
      ownerUserId: list === "personal" ? result.userId : null,
      addedByUserId: result.userId,
      region: result.membership.household.region,
      movie: {
        tmdbMovieId: body.movie.tmdbMovieId,
        mediaType: body.movie.mediaType ?? "movie",
        title: body.movie.title,
        year: body.movie.year ?? null,
        posterPath: body.movie.posterPath ?? null,
        overview: body.movie.overview ?? "",
      },
    },
  );

  if (!added.ok) {
    return jsonError("That title is already on this list", 409);
  }

  const [household, personal] = await Promise.all([
    getHouseholdProviders(result.membership.householdId),
    getPersonalProviders(result.userId, result.membership.householdId),
  ]);
  const availability = availabilityForViewer(
    {
      flatrate: added.item.cachedFlatrateProviders,
      rent: added.item.cachedRentProviders,
      watchUrl: added.item.watchUrl,
    },
    mergeEffectiveServices(household, personal),
  );

  return NextResponse.json(
    { item: { ...added.item, availability, watchState: null } },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as { ids?: string[] };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return jsonError("ids are required", 400);
  }

  await saveWatchlistOrder(result.membership.householdId, body.ids);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required", 400);

  const db = getDb();
  const [row] = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.id, id))
    .limit(1);

  if (!row || row.householdId !== result.membership.householdId) {
    return jsonError("Title not found", 404);
  }

  if (row.list === "personal" && row.ownerUserId !== result.userId) {
    return jsonError("You can only remove titles from your own list", 403);
  }

  await db.delete(watchlistItems).where(eq(watchlistItems.id, id));
  return NextResponse.json({ ok: true });
}
