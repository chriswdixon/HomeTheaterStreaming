import { afterEach, describe, expect, it, vi } from "vitest";
import { clerkKeyIssue } from "./clerk-env";

describe("clerkKeyIssue", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("flags test publishable keys on production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");
    expect(clerkKeyIssue()).toMatch(/development keys/i);
  });

  it("returns null for live keys on production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_live_example");
    expect(clerkKeyIssue()).toBeNull();
  });
});
