import { describe, expect, it } from "vitest";
import { availabilityForViewer, dedupeProvidersByFamily, matchingRentProviders } from "./availability";

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
const appleTvPlus = {
  tmdbProviderId: 350,
  name: "Apple TV+",
  logoPath: "/appletvplus.png",
};

const watchUrl = "https://www.themoviedb.org/movie/550/watch?locale=US";
const title = {
  title: "Fight Club",
  tmdbMovieId: 550,
  mediaType: "movie" as const,
};

describe("dedupeProvidersByFamily", () => {
  it("keeps one provider per service family", () => {
    expect(
      dedupeProvidersByFamily([prime, amazonVideo, netflix]).map(
        (provider) => provider.tmdbProviderId,
      ),
    ).toEqual([9, 8]);
  });
});

describe("matchingRentProviders", () => {
  it("returns every rental store that matches a selected service", () => {
    expect(
      matchingRentProviders([amazonVideo, appleTv], [prime, appleTvPlus]),
    ).toEqual([amazonVideo, appleTv]);
  });
});

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
      onRentServices: [],
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

  it("offers rentals on every matching store when the title is not included with a subscription", () => {
    expect(
      availabilityForViewer(
        { flatrate: [max], rent: [amazonVideo, appleTv], watchUrl },
        [prime],
      ),
    ).toEqual({
      available: false,
      onServices: [],
      onRentServices: [amazonVideo],
      rentOffer: { provider: amazonVideo, watchUrl },
      openTarget: null,
    });
  });

  it("shows all matching rental stores for the viewer's selected services", () => {
    expect(
      availabilityForViewer(
        { flatrate: [max], rent: [amazonVideo, appleTv], watchUrl },
        [prime, appleTvPlus],
      ).onRentServices,
    ).toEqual([amazonVideo, appleTv]);
  });

  it("opens the TMDB watch page when rentals exist but none match the viewer's services", () => {
    const availability = availabilityForViewer(
      { flatrate: [max], rent: [amazonVideo], watchUrl },
      [netflix],
      title,
    );

    expect(availability.onRentServices).toEqual([]);
    expect(availability.openTarget?.webUrl).toBe(watchUrl);
    expect(availability.openTarget?.provider.name).toBe("Watch options");
  });

  it("does not show rental stores that do not match the viewer's services", () => {
    expect(
      availabilityForViewer(
        { flatrate: [max], rent: [appleTv], watchUrl },
        [netflix],
      ),
    ).toEqual({
      available: false,
      onServices: [],
      onRentServices: [],
      rentOffer: null,
      openTarget: null,
    });
  });

  it("has no rent offer when TMDB lists no rental providers", () => {
    expect(
      availabilityForViewer({ flatrate: [max], rent: [], watchUrl }, [netflix]),
    ).toEqual({
      available: false,
      onServices: [],
      onRentServices: [],
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
