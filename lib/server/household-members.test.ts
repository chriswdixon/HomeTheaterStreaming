import { describe, expect, it } from "vitest";
import { householdMemberDisplayName } from "./household-members";

describe("householdMemberDisplayName", () => {
  it("prefers the clerk first name", () => {
    expect(
      householdMemberDisplayName({
        firstName: "Chris",
        fullName: "Chris Dixon",
        username: "cdixon",
        primaryEmailAddress: { emailAddress: "chris@example.com" },
      }),
    ).toBe("Chris");
  });

  it("falls back to the first word of full name", () => {
    expect(
      householdMemberDisplayName({
        firstName: null,
        fullName: "Jamie Lee",
        username: null,
        primaryEmailAddress: null,
      }),
    ).toBe("Jamie");
  });
});
