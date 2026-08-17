import { describe, expect, it } from "vitest";
import { mergeEffectiveServices } from "./effective-services";

const netflix = {
  tmdbProviderId: 8,
  name: "Netflix",
  logoPath: "/netflix.png",
};
const max = { tmdbProviderId: 1899, name: "Max", logoPath: "/max.png" };
const criterion = {
  tmdbProviderId: 258,
  name: "Criterion Channel",
  logoPath: "/cc.png",
};

describe("mergeEffectiveServices", () => {
  it("returns household services when there are no personal add-ons", () => {
    expect(mergeEffectiveServices([netflix, max], [])).toEqual([netflix, max]);
  });

  it("adds personal services that the household does not already have", () => {
    expect(mergeEffectiveServices([netflix], [criterion])).toEqual([
      netflix,
      criterion,
    ]);
  });

  it("does not duplicate a service that exists on both lists", () => {
    const householdNetflix = { ...netflix, logoPath: "/household.png" };
    const personalNetflix = { ...netflix, logoPath: "/personal.png" };

    expect(
      mergeEffectiveServices([householdNetflix], [personalNetflix, criterion]),
    ).toEqual([householdNetflix, criterion]);
  });
});
