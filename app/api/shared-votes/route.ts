import { jsonError, jsonOk, requireHousehold } from "@/lib/server/api";
import { toggleSharedListVote } from "@/lib/server/shared-list-votes";

export async function POST(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as { watchlistItemId?: string };
  if (!body.watchlistItemId) {
    return jsonError("watchlistItemId is required", 400);
  }

  try {
    const summary = await toggleSharedListVote(
      result.userId,
      result.membership.householdId,
      body.watchlistItemId,
    );
    return jsonOk(summary);
  } catch {
    return jsonError("Shared list title not found", 404);
  }
}
