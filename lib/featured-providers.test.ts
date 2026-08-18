import { describe, expect, it } from "vitest";
import { partitionProviders } from "./featured-providers";

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
