import { describe, expect, it } from "vitest";
import {
  buildHouseholdInviteUrl,
  householdInvitePath,
  isValidInviteCodeFormat,
  normalizeInviteCode,
} from "./household-invite";

describe("household invite helpers", () => {
  it("normalizes invite codes", () => {
    expect(normalizeInviteCode(" abcd2345 ")).toBe("ABCD2345");
  });

  it("validates invite code format", () => {
    expect(isValidInviteCodeFormat("ABCD2345")).toBe(true);
    expect(isValidInviteCodeFormat("abc")).toBe(false);
    expect(isValidInviteCodeFormat("ABCD2345X")).toBe(false);
  });

  it("builds invite paths and urls", () => {
    expect(householdInvitePath("abcd2345")).toBe("/join/ABCD2345");
    expect(buildHouseholdInviteUrl("ABCD2345", "https://example.com/")).toBe(
      "https://example.com/join/ABCD2345",
    );
  });
});
