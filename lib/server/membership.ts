import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  householdMembers,
  householdSubscriptions,
  households,
  userSubscriptions,
} from "@/db/schema";
import type { Provider } from "@/lib/effective-services";
import type { DefaultListView } from "@/lib/default-list-view";

export type Membership = {
  userId: string;
  householdId: string;
  role: "owner" | "member";
  defaultListView: DefaultListView;
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
      defaultListView: householdMembers.defaultListView,
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
    defaultListView:
      row.defaultListView === "shared" ? "shared" : "personal",
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

export async function getHouseholdInvitePreview(code: string) {
  const normalized = code.trim().toUpperCase();
  const db = getDb();
  const [household] = await db
    .select({
      name: households.name,
      region: households.region,
    })
    .from(households)
    .where(eq(households.inviteCode, normalized))
    .limit(1);

  return household ?? null;
}

export async function updateDefaultListView(
  userId: string,
  householdId: string,
  defaultListView: DefaultListView,
) {
  const db = getDb();
  await db
    .update(householdMembers)
    .set({ defaultListView })
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    );
}
