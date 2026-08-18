import { jsonError, jsonOk, requireHousehold } from "@/lib/server/api";
import { addFranchiseFolderToWatchlist } from "@/lib/server/watchlist-actions";
import { createDbWatchlistStore } from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";
import type { MediaType } from "@/lib/media";
import type { WatchlistKind } from "@/lib/watchlist";

function parseList(value: string | null): WatchlistKind | null {
  if (value === "personal" || value === "shared") return value;
  return null;
}

export async function POST(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    list?: WatchlistKind;
    folderName?: string;
    movies?: Array<{
      tmdbMovieId: number;
      mediaType?: MediaType;
      title: string;
      year: string | null;
      posterPath: string | null;
      overview: string;
      order: number;
    }>;
  };

  const list = parseList(body.list ?? null);
  if (!list) return jsonError("list must be personal or shared", 400);
  if (!body.folderName?.trim()) {
    return jsonError("folderName is required", 400);
  }
  if (!Array.isArray(body.movies) || body.movies.length === 0) {
    return jsonError("movies are required", 400);
  }

  const outcome = await addFranchiseFolderToWatchlist(
    {
      tmdb: createTmdbClient(),
      store: createDbWatchlistStore(result.membership.householdId),
    },
    {
      list,
      ownerUserId: list === "personal" ? result.userId : null,
      addedByUserId: result.userId,
      region: result.membership.household.region,
      folderName: body.folderName.trim(),
      movies: body.movies.map((movie) => ({
        tmdbMovieId: movie.tmdbMovieId,
        mediaType: movie.mediaType ?? "movie",
        title: movie.title,
        year: movie.year ?? null,
        posterPath: movie.posterPath ?? null,
        overview: movie.overview ?? "",
        order: movie.order,
      })),
    },
  );

  return jsonOk(outcome, { status: 201 });
}
