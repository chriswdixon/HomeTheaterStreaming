import { describe, expect, it } from "vitest";
import { generateInviteCode } from "./invite-code";

describe("generateInviteCode", () => {
  it("returns an 8-character uppercase code without ambiguous characters", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });

  it("does not return the same value every call", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
