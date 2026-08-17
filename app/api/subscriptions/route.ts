import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { householdSubscriptions, userSubscriptions } from "@/db/schema";
import type { Provider } from "@/lib/effective-services";
import { mergeEffectiveServices } from "@/lib/effective-services";
import { jsonError, requireHousehold } from "@/lib/server/api";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";

export async function GET() {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const [household, personal] = await Promise.all([
    getHouseholdProviders(result.membership.householdId),
    getPersonalProviders(result.userId, result.membership.householdId),
  ]);

  return NextResponse.json({
    household,
    personal,
    effective: mergeEffectiveServices(household, personal),
  });
}

export async function PUT(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    scope?: "household" | "personal";
    providers?: Provider[];
  };

  if (body.scope !== "household" && body.scope !== "personal") {
    return jsonError("scope must be household or personal", 400);
  }

  const providers = Array.isArray(body.providers) ? body.providers : [];
  const unique = new Map<number, Provider>();
  for (const provider of providers) {
    if (typeof provider.tmdbProviderId !== "number") continue;
    unique.set(provider.tmdbProviderId, {
      tmdbProviderId: provider.tmdbProviderId,
      name: provider.name,
      logoPath: provider.logoPath ?? null,
    });
  }

  const db = getDb();

  if (body.scope === "household") {
    await db
      .delete(householdSubscriptions)
      .where(eq(householdSubscriptions.householdId, result.membership.householdId));
    const values = [...unique.values()];
    if (values.length > 0) {
      await db.insert(householdSubscriptions).values(
        values.map((provider) => ({
          householdId: result.membership.householdId,
          tmdbProviderId: provider.tmdbProviderId,
          name: provider.name,
          logoPath: provider.logoPath,
        })),
      );
    }
  } else {
    await db
      .delete(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, result.userId),
          eq(userSubscriptions.householdId, result.membership.householdId),
        ),
      );
    const values = [...unique.values()];
    if (values.length > 0) {
      await db.insert(userSubscriptions).values(
        values.map((provider) => ({
          userId: result.userId,
          householdId: result.membership.householdId,
          tmdbProviderId: provider.tmdbProviderId,
          name: provider.name,
          logoPath: provider.logoPath,
        })),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
