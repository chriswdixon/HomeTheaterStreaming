import { describe, expect, it } from "vitest";
import { availabilityForViewer } from "./availability";

const netflix = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};
const max = { tmdbProviderId: 1899, name: "Max", logoPath: "/max.png" };

describe("availabilityForViewer", () => {
  it("returns the subset of cached providers the viewer subscribes to", () => {
    expect(
      availabilityForViewer([netflix, max], new Set([8])),
    ).toEqual({
      available: true,
      onServices: [netflix],
    });
  });

  it("marks a movie unavailable when it is not on any of the viewer's services", () => {
    expect(availabilityForViewer([max], new Set([8]))).toEqual({
      available: false,
      onServices: [],
    });
  });
});
