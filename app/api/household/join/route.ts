import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { householdMembers, households } from "@/db/schema";
import { jsonError, requireUserId } from "@/lib/server/api";
import { getMembership } from "@/lib/server/membership";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const existing = await getMembership(authResult.userId);
  if (existing) {
    return jsonError("You already belong to a household", 409);
  }

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

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: authResult.userId,
    role: "member",
  });

  return NextResponse.json({ household, role: "member" });
}
