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
    });
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
    });
  });

  it("has no rent offer when TMDB lists no rental providers", () => {
    expect(
      availabilityForViewer({ flatrate: [max], rent: [], watchUrl }, [netflix]),
    ).toEqual({
      available: false,
      onServices: [],
      rentOffer: null,
    });
  });
});
