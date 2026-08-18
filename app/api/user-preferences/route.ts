import { NextResponse } from "next/server";
import { parseDefaultListView } from "@/lib/default-list-view";
import { jsonError, requireHousehold } from "@/lib/server/api";
import { updateDefaultListView } from "@/lib/server/membership";

export async function GET() {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  return NextResponse.json({
    defaultListView: result.membership.defaultListView,
  });
}

export async function PATCH(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as { defaultListView?: unknown };
  const defaultListView = parseDefaultListView(body.defaultListView);
  if (!defaultListView) {
    return jsonError("defaultListView must be personal or shared", 400);
  }

  await updateDefaultListView(
    result.userId,
    result.membership.householdId,
    defaultListView,
  );

  return NextResponse.json({ defaultListView });
}
