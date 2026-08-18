import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  householdMembers,
  householdSubscriptions,
  households,
} from "@/db/schema";
import { generateInviteCode } from "@/lib/invite-code";
import { isWatchRegion } from "@/lib/regions";
import { jsonError, requireUserId } from "@/lib/server/api";
import { buildActiveHouseholdCookie } from "@/lib/server/active-household";
import { getActiveHouseholdIdFromCookies } from "@/lib/server/active-household";
import { getMembership, getMemberships } from "@/lib/server/membership";
import { refreshHouseholdAvailability } from "@/lib/server/watchlist-store";
import type { Provider } from "@/lib/effective-services";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const memberships = await getMemberships(authResult.userId);
  if (memberships.length === 0) {
    return NextResponse.json({ household: null, households: [] });
  }

  const activeHouseholdId = await getActiveHouseholdIdFromCookies();
  const membership = await getMembership(authResult.userId, activeHouseholdId);

  return NextResponse.json({
    household: membership?.household ?? null,
    role: membership?.role ?? null,
    households: memberships.map((row) => ({
      id: row.household.id,
      name: row.household.name,
      inviteCode: row.household.inviteCode,
      region: row.household.region,
      role: row.role,
    })),
    activeHouseholdId: membership?.householdId ?? null,
  });
}

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as {
    name?: string;
    region?: string;
    services?: Provider[];
  };

  const name = body.name?.trim();
  const region = body.region?.trim().toUpperCase() || "US";
  const services = Array.isArray(body.services) ? body.services : [];

  if (!name) return jsonError("Household name is required", 400);
  if (!isWatchRegion(region)) return jsonError("Unknown streaming region", 400);

  const db = getDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      const [household] = await db
        .insert(households)
        .values({
          name,
          region,
          inviteCode,
          createdByUserId: authResult.userId,
        })
        .returning();

      if (!household) {
        return jsonError("Could not create household", 500);
      }

      await db.insert(householdMembers).values({
        householdId: household.id,
        userId: authResult.userId,
        role: "owner",
      });

      if (services.length > 0) {
        await db.insert(householdSubscriptions).values(
          services.map((service) => ({
            householdId: household.id,
            tmdbProviderId: service.tmdbProviderId,
            name: service.name,
            logoPath: service.logoPath,
          })),
        );
      }

      return NextResponse.json(
        { household, role: "owner" },
        {
          status: 201,
          headers: { "Set-Cookie": buildActiveHouseholdCookie(household.id) },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("unique") || message.includes("duplicate")) {
        continue;
      }
      throw error;
    }
  }

  return jsonError("Could not create a unique invite code", 500);
}

export async function PATCH(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const activeHouseholdId = await getActiveHouseholdIdFromCookies();
  const membership = await getMembership(authResult.userId, activeHouseholdId);
  if (!membership) {
    return jsonError("Join or create a household first", 409);
  }

  const body = (await request.json()) as { name?: string; region?: string };
  const updates: { name?: string; region?: string } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.region === "string") {
    const region = body.region.trim().toUpperCase();
    if (!isWatchRegion(region)) return jsonError("Unknown streaming region", 400);
    updates.region = region;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("Nothing to update", 400);
  }

  const db = getDb();
  const [household] = await db
    .update(households)
    .set(updates)
    .where(eq(households.id, membership.householdId))
    .returning();

  if (updates.region && updates.region !== membership.household.region) {
    await refreshHouseholdAvailability(membership.householdId, updates.region);
  }

  return NextResponse.json({ household });
}
