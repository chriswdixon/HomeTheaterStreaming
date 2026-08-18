import { NextResponse } from "next/server";
import type { MediaType } from "@/lib/media";
import { jsonError, requireUserId } from "@/lib/server/api";
import { createTmdbClient } from "@/lib/tmdb";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await context.params;
  const movieId = Number(id);
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return jsonError("Invalid title id", 400);
  }

  const mediaType = new URL(request.url).searchParams.get("mediaType");
  if (mediaType !== "movie" && mediaType !== "tv") {
    return jsonError("mediaType must be movie or tv", 400);
  }

  try {
    const details = await createTmdbClient().getTitleDetails(
      movieId,
      mediaType as MediaType,
    );
    if (!details) {
      return jsonError("Title not found", 404);
    }
    return NextResponse.json({ details });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load title details";
    return jsonError(message, 502);
  }
}
