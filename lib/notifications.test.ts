import { describe, expect, it } from "vitest";
import { householdMemberJoinedMessage } from "./notifications";

describe("householdMemberJoinedMessage", () => {
  it("formats a join notification", () => {
    expect(householdMemberJoinedMessage("Chris")).toBe(
      "Chris joined your household",
    );
  });
});
