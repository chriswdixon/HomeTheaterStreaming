import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getMembership, type Membership } from "./membership";

export async function requirePageMembership(): Promise<{
  userId: string;
  membership: Membership;
}> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const membership = await getMembership(userId);
  if (!membership) redirect("/onboarding");
  return { userId, membership };
}
