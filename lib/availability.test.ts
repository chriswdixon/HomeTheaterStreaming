import { describe, expect, it } from "vitest";
import { availabilityForViewer } from "./availability";

const netflix = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};
const max = { tmdbProviderId: 1899, name: "Max", logoPath: "/max.png" };
const prime = {
  tmdbProviderId: 9,
  name: "Amazon Prime Video",
  logoPath: "/prime.png",
};
const amazonVideo = {
  tmdbProviderId: 10,
  name: "Amazon Video",
  logoPath: "/amazon.png",
};
const appleTv = {
  tmdbProviderId: 2,
  name: "Apple TV",
  logoPath: "/apple.png",
};

const watchUrl = "https://www.themoviedb.org/movie/550/watch?locale=US";
const title = {
  title: "Fight Club",
  tmdbMovieId: 550,
  mediaType: "movie" as const,
};

describe("availabilityForViewer", () => {
  it("returns the subset of cached providers the viewer subscribes to", () => {
    expect(
      availabilityForViewer(
        { flatrate: [netflix, max], rent: [], watchUrl },
        [netflix],
      ),
    ).toEqual({
      available: true,
      onServices: [netflix],
      rentOffer: null,
      openTarget: null,
    });
  });

  it("builds a streaming open target when title context is provided", () => {
    const availability = availabilityForViewer(
      { flatrate: [netflix], rent: [], watchUrl },
      [netflix],
      title,
    );

    expect(availability.openTarget).toEqual({
      provider: netflix,
      appUrl: "nflx://www.netflix.com/search?q=Fight%20Club",
      webUrl: "https://www.netflix.com/search?q=Fight%20Club",
    });
  });

  it("offers a rental on a matching store when the title is not included with a subscription", () => {
    expect(
      availabilityForViewer(
        { flatrate: [max], rent: [amazonVideo, appleTv], watchUrl },
        [prime],
      ),
    ).toEqual({
      available: false,
      onServices: [],
      rentOffer: { provider: amazonVideo, watchUrl },
      openTarget: null,
    });
  });

  it("builds a rent open target using the TMDB watch page as browser fallback", () => {
    const availability = availabilityForViewer(
      { flatrate: [max], rent: [amazonVideo], watchUrl },
      [netflix],
      title,
    );

    expect(availability.openTarget?.webUrl).toBe(watchUrl);
    expect(availability.openTarget?.provider).toEqual(amazonVideo);
  });

  it("falls back to the first rental store when none of the viewer's services offer a rent option", () => {
    expect(
      availabilityForViewer(
        { flatrate: [max], rent: [appleTv], watchUrl },
        [netflix],
      ),
    ).toEqual({
      available: false,
      onServices: [],
      rentOffer: { provider: appleTv, watchUrl },
      openTarget: null,
    });
  });

  it("has no rent offer when TMDB lists no rental providers", () => {
    expect(
      availabilityForViewer({ flatrate: [max], rent: [], watchUrl }, [netflix]),
    ).toEqual({
      available: false,
      onServices: [],
      rentOffer: null,
      openTarget: null,
    });
  });

  it("opens the TMDB watch page when nothing streams but a watch page exists", () => {
    const availability = availabilityForViewer(
      { flatrate: [max], rent: [], watchUrl },
      [netflix],
      title,
    );

    expect(availability.openTarget).toEqual({
      provider: {
        tmdbProviderId: 0,
        name: "Watch options",
        logoPath: null,
      },
      appUrl: watchUrl,
      webUrl: watchUrl,
    });
  });
});
