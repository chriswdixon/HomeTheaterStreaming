import { NextResponse } from "next/server";
import { jsonError, requireUserId } from "@/lib/server/api";
import { getActiveHouseholdIdFromCookies } from "@/lib/server/active-household";
import { getMembership } from "@/lib/server/membership";
import { isWatchRegion } from "@/lib/regions";
import { createTmdbClient } from "@/lib/tmdb";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(request.url);
  let region = searchParams.get("region")?.toUpperCase();

  if (!region) {
    const activeHouseholdId = await getActiveHouseholdIdFromCookies();
    const membership = await getMembership(authResult.userId, activeHouseholdId);
    region = membership?.household.region ?? "US";
  }

  if (!isWatchRegion(region)) {
    return jsonError("Unknown streaming region", 400);
  }

  try {
    const providers = await createTmdbClient().listWatchProviders(region);
    return NextResponse.json({ region, providers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load streaming services";
    return jsonError(message, 502);
  }
}
