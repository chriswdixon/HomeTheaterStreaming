import { cookies } from "next/headers";
import {
  ACTIVE_HOUSEHOLD_COOKIE,
  ACTIVE_HOUSEHOLD_COOKIE_MAX_AGE,
} from "@/lib/active-household";

export function buildActiveHouseholdCookie(householdId: string) {
  return `${ACTIVE_HOUSEHOLD_COOKIE}=${householdId}; Path=/; Max-Age=${ACTIVE_HOUSEHOLD_COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`;
}

export function clearActiveHouseholdCookie() {
  return `${ACTIVE_HOUSEHOLD_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

export async function getActiveHouseholdIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value?.trim();
  return value || null;
}
