import { describe, expect, it } from "vitest";
import { mergeRentalProviders, needsWatchProviderBackfill } from "./watch-providers";

const amazonVideo = {
  tmdbProviderId: 10,
  name: "Amazon Video",
  logoPath: null,
};
const appleTv = {
  tmdbProviderId: 2,
  name: "Apple TV Store",
  logoPath: null,
};

describe("mergeRentalProviders", () => {
  it("deduplicates rent and buy entries for the same store", () => {
    expect(
      mergeRentalProviders([amazonVideo], [amazonVideo, appleTv]),
    ).toEqual([amazonVideo, appleTv]);
  });
});

describe("needsWatchProviderBackfill", () => {
  it("returns true when rent data or watchUrl is missing", () => {
    expect(
      needsWatchProviderBackfill({
        cachedRentProviders: [],
        watchUrl: null,
      }),
    ).toBe(true);
    expect(
      needsWatchProviderBackfill({
        cachedRentProviders: [amazonVideo],
        watchUrl: "https://example.com/watch",
      }),
    ).toBe(false);
  });
});
