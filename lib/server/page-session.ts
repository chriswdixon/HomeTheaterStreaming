import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getActiveHouseholdIdFromCookies } from "./active-household";
import {
  getMembership,
  getMemberships,
  type Membership,
} from "./membership";

export async function requirePageMembership(): Promise<{
  userId: string;
  membership: Membership;
  memberships: Membership[];
}> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const memberships = await getMemberships(userId);
  if (memberships.length === 0) redirect("/onboarding");

  const activeHouseholdId = await getActiveHouseholdIdFromCookies();
  const membership =
    (activeHouseholdId
      ? memberships.find((row) => row.householdId === activeHouseholdId)
      : null) ?? memberships[0]!;

  return { userId, membership, memberships };
}
