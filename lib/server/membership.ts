import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  householdMembers,
  householdSubscriptions,
  households,
  userSubscriptions,
} from "@/db/schema";
import type { Provider } from "@/lib/effective-services";

export type Membership = {
  userId: string;
  householdId: string;
  role: "owner" | "member";
  household: {
    id: string;
    name: string;
    inviteCode: string;
    region: string;
  };
};

export async function getMembership(userId: string): Promise<Membership | null> {
  const db = getDb();
  const [row] = await db
    .select({
      userId: householdMembers.userId,
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      household: households,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, userId))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    householdId: row.householdId,
    role: row.role === "owner" ? "owner" : "member",
    household: {
      id: row.household.id,
      name: row.household.name,
      inviteCode: row.household.inviteCode,
      region: row.household.region,
    },
  };
}

export async function getHouseholdProviders(
  householdId: string,
): Promise<Provider[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(householdSubscriptions)
    .where(eq(householdSubscriptions.householdId, householdId));

  return rows.map((row) => ({
    tmdbProviderId: row.tmdbProviderId,
    name: row.name,
    logoPath: row.logoPath,
  }));
}

export async function getPersonalProviders(
  userId: string,
  householdId: string,
): Promise<Provider[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.householdId, householdId),
      ),
    );

  return rows.map((row) => ({
      tmdbProviderId: row.tmdbProviderId,
      name: row.name,
      logoPath: row.logoPath,
    }));
}
