import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { householdMembers, households } from "@/db/schema";
import { jsonError, requireUserId } from "@/lib/server/api";
import { buildActiveHouseholdCookie } from "@/lib/server/active-household";
import { notifyHouseholdMemberJoined } from "@/lib/server/notifications";
import { userBelongsToHousehold } from "@/lib/server/membership";

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) return jsonError("Invite code is required", 400);

  const db = getDb();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, code))
    .limit(1);

  if (!household) {
    return jsonError("No household matches that invite code", 404);
  }

  const alreadyMember = await userBelongsToHousehold(
    authResult.userId,
    household.id,
  );
  if (alreadyMember) {
    return jsonError("You are already in this shared list", 409);
  }

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: authResult.userId,
    role: "member",
  });

  await notifyHouseholdMemberJoined(household.id, authResult.userId);

  return NextResponse.json(
    { household, role: "member" },
    { headers: { "Set-Cookie": buildActiveHouseholdCookie(household.id) } },
  );
}
