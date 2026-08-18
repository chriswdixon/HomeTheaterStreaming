import { describe, expect, it } from "vitest";
import { partitionProviderSections, partitionProviders } from "./featured-providers";

describe("partitionProviders", () => {
  it("puts well-known services in the featured group", () => {
    const netflix = { tmdbProviderId: 8, name: "Netflix", logoPath: null };
    const viki = { tmdbProviderId: 344, name: "Rakuten Viki", logoPath: null };
    const obscure = { tmdbProviderId: 99, name: "Local Cable", logoPath: null };

    expect(partitionProviders([obscure, netflix, viki])).toEqual({
      featured: [netflix, viki],
      rest: [obscure],
    });
  });
});

describe("partitionProviderSections", () => {
  it("lists selected services above popular and more", () => {
    const netflix = { tmdbProviderId: 8, name: "Netflix", logoPath: null };
    const hulu = { tmdbProviderId: 15, name: "Hulu", logoPath: null };
    const obscure = { tmdbProviderId: 99, name: "Local Cable", logoPath: null };

    expect(
      partitionProviderSections([obscure, netflix, hulu], new Set([99])).selected,
    ).toEqual([obscure]);
    expect(
      partitionProviderSections([obscure, netflix, hulu], new Set([99])).featured,
    ).toEqual([hulu, netflix]);
    expect(
      partitionProviderSections([obscure, netflix, hulu], new Set([99])).rest,
    ).toEqual([]);
  });
});
