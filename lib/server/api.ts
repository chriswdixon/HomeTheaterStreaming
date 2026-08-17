import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getMembership, type Membership } from "./membership";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUserId(): Promise<
  { error: NextResponse } | { userId: string }
> {
  const { userId } = await auth();
  if (!userId) {
    return { error: jsonError("Sign in required", 401) };
  }
  return { userId };
}

export async function requireHousehold(): Promise<
  { error: NextResponse } | { userId: string; membership: Membership }
> {
  const result = await requireUserId();
  if ("error" in result) return result;

  const membership = await getMembership(result.userId);
  if (!membership) {
    return { error: jsonError("Join or create a household first", 409) };
  }

  return { userId: result.userId, membership };
}
