import { describe, expect, it } from "vitest";
import { resolveActiveMembership, type Membership } from "./membership";

function membership(id: string, name: string): Membership {
  return {
    userId: "user_1",
    householdId: id,
    role: "member",
    defaultListView: "personal",
    household: {
      id,
      name,
      inviteCode: "ABCD2345",
      region: "US",
    },
  };
}

describe("resolveActiveMembership", () => {
  const lists = [membership("hh_1", "Family"), membership("hh_2", "Friends")];

  it("returns null when there are no memberships", () => {
    expect(resolveActiveMembership([])).toBeNull();
  });

  it("returns the first membership by default", () => {
    expect(resolveActiveMembership(lists)?.householdId).toBe("hh_1");
  });

  it("returns the preferred membership when it exists", () => {
    expect(resolveActiveMembership(lists, "hh_2")?.household.name).toBe("Friends");
  });

  it("falls back to the first membership when preferred id is unknown", () => {
    expect(resolveActiveMembership(lists, "hh_missing")?.householdId).toBe("hh_1");
  });
});
