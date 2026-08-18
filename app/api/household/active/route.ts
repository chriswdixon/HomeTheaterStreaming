import { NextResponse } from "next/server";
import { jsonError, requireUserId } from "@/lib/server/api";
import {
  buildActiveHouseholdCookie,
} from "@/lib/server/active-household";
import { userBelongsToHousehold } from "@/lib/server/membership";

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as { householdId?: string };
  const householdId = body.householdId?.trim();
  if (!householdId) return jsonError("householdId is required", 400);

  const allowed = await userBelongsToHousehold(authResult.userId, householdId);
  if (!allowed) {
    return jsonError("You are not a member of that shared list", 403);
  }

  return NextResponse.json(
    { activeHouseholdId: householdId },
    { headers: { "Set-Cookie": buildActiveHouseholdCookie(householdId) } },
  );
}
