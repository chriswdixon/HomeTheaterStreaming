import { and, asc, eq } from "drizzle-orm";
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

type MembershipRow = {
  userId: string;
  householdId: string;
  role: string;
  defaultListView: string;
  household: {
    id: string;
    name: string;
    inviteCode: string;
    region: string;
  };
};

function mapMembershipRow(row: MembershipRow): Membership {
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

export function resolveActiveMembership(
  memberships: Membership[],
  preferredHouseholdId?: string | null,
): Membership | null {
  if (memberships.length === 0) return null;

  if (preferredHouseholdId) {
    const match = memberships.find(
      (membership) => membership.householdId === preferredHouseholdId,
    );
    if (match) return match;
  }

  return memberships[0] ?? null;
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  const db = getDb();
  const rows = await db
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
    .orderBy(asc(householdMembers.createdAt));

  return rows.map(mapMembershipRow);
}

export async function getMembership(
  userId: string,
  preferredHouseholdId?: string | null,
): Promise<Membership | null> {
  const memberships = await getMemberships(userId);
  return resolveActiveMembership(memberships, preferredHouseholdId);
}

export async function userBelongsToHousehold(
  userId: string,
  householdId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    )
    .limit(1);

  return Boolean(row);
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
      id: households.id,
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
