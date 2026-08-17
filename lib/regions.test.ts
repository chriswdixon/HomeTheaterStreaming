import { describe, expect, it } from "vitest";
import { isWatchRegion } from "./regions";

describe("isWatchRegion", () => {
  it("accepts the household default region", () => {
    expect(isWatchRegion("US")).toBe(true);
  });

  it("rejects unknown country codes", () => {
    expect(isWatchRegion("XX")).toBe(false);
  });
});
