import type { User } from "@clerk/backend";
import { asc, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { householdMembers } from "@/db/schema";

export type HouseholdMemberView = {
  userId: string;
  role: "owner" | "member";
  displayName: string;
  imageUrl: string | null;
  isCurrentUser: boolean;
};

export function householdMemberDisplayName(user: Pick<User, "firstName" | "fullName" | "username" | "primaryEmailAddress">) {
  if (user.firstName?.trim()) return user.firstName.trim();

  const fullName = user.fullName?.trim();
  if (fullName) {
    const [firstName] = fullName.split(/\s+/);
    if (firstName) return firstName;
  }

  if (user.username?.trim()) return user.username.trim();

  const email = user.primaryEmailAddress?.emailAddress;
  if (email) return email.split("@")[0] ?? email;

  return "Member";
}

export async function loadHouseholdMembers(
  householdId: string,
  currentUserId: string,
): Promise<HouseholdMemberView[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: householdMembers.userId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(householdMembers.createdAt));

  const client = await clerkClient();
  const members = await Promise.all(
    rows.map(async (row) => {
      const role = row.role === "owner" ? "owner" : "member";
      try {
        const user = await client.users.getUser(row.userId);
        const displayName = householdMemberDisplayName(user);

        return {
          userId: row.userId,
          role,
          displayName,
          imageUrl: user.hasImage ? user.imageUrl : null,
          isCurrentUser: row.userId === currentUserId,
        } satisfies HouseholdMemberView;
      } catch {
        return {
          userId: row.userId,
          role,
          displayName: "Member",
          imageUrl: null,
          isCurrentUser: row.userId === currentUserId,
        } satisfies HouseholdMemberView;
      }
    }),
  );

  return members.sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "owner" ? -1 : 1;
    }
    return left.displayName.localeCompare(right.displayName);
  });
}
