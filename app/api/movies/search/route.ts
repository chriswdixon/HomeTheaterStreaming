import { NextResponse } from "next/server";
import { jsonError, requireUserId } from "@/lib/server/api";
import { createTmdbClient } from "@/lib/tmdb";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const movies = await createTmdbClient().searchMovies(query);
    return NextResponse.json({ movies });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return jsonError(message, 502);
  }
}
