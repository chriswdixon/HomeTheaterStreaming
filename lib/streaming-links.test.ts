import { describe, expect, it } from "vitest";
import { streamingOpenTarget } from "./streaming-links";

const netflix = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};
const prime = {
  tmdbProviderId: 9,
  name: "Amazon Prime Video",
  logoPath: "/prime.png",
};
const unknown = {
  tmdbProviderId: 9999,
  name: "Obscure Stream",
  logoPath: null,
};

const watchUrl = "https://www.themoviedb.org/movie/550/watch?locale=US";

describe("streamingOpenTarget", () => {
  it("builds app and web search links for a known subscription service", () => {
    const target = streamingOpenTarget({
      provider: netflix,
      title: "Fight Club",
      watchUrl,
    });

    expect(target).toEqual({
      provider: netflix,
      appUrl: "nflx://www.netflix.com/search?q=Fight%20Club",
      webUrl: "https://www.netflix.com/search?q=Fight%20Club",
    });
  });

  it("maps Prime Video to Amazon search links", () => {
    const target = streamingOpenTarget({
      provider: prime,
      title: "Dune",
      watchUrl,
    });

    expect(target?.webUrl).toContain("amazon.com");
    expect(target?.webUrl).toContain("Dune");
    expect(target?.appUrl).toContain("aiv://");
  });

  it("builds Viki search links", () => {
    const viki = {
      tmdbProviderId: 344,
      name: "Rakuten Viki",
      logoPath: null,
    };
    const target = streamingOpenTarget({
      provider: viki,
      title: "Crash Landing on You",
      watchUrl,
    });

    expect(target).toEqual({
      provider: viki,
      appUrl: "https://www.viki.com/search?q=Crash%20Landing%20on%20You",
      webUrl: "https://www.viki.com/search?q=Crash%20Landing%20on%20You",
    });
  });

  it("falls back to the TMDB watch page when the provider is unknown", () => {
    expect(
      streamingOpenTarget({
        provider: unknown,
        title: "Obscure Title",
        watchUrl,
      }),
    ).toEqual({
      provider: unknown,
      appUrl: watchUrl,
      webUrl: watchUrl,
    });
  });

  it("returns null when there is no provider link and no watch page", () => {
    expect(
      streamingOpenTarget({
        provider: unknown,
        title: "Obscure Title",
        watchUrl: null,
      }),
    ).toBeNull();
  });
});
