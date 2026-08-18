import { describe, expect, it } from "vitest";
import { formatReleaseLabel, releaseYearFromDate } from "./release-label";

describe("releaseYearFromDate", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");

  it("returns null for missing or future release dates", () => {
    expect(releaseYearFromDate(null, now)).toBeNull();
    expect(releaseYearFromDate("2027-05-01", now)).toBeNull();
  });

  it("returns the release year for past and current releases", () => {
    expect(releaseYearFromDate("2021-10-22", now)).toBe("2021");
    expect(releaseYearFromDate("2026-01-01", now)).toBe("2026");
  });
});

describe("formatReleaseLabel", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");

  it('shows "Unreleased" when the year is missing or in the future', () => {
    expect(formatReleaseLabel(null, now)).toBe("Unreleased");
    expect(formatReleaseLabel("2027", now)).toBe("Unreleased");
  });

  it("shows the release year for released titles", () => {
    expect(formatReleaseLabel("2024", now)).toBe("2024");
  });
});
