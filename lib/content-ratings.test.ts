import { describe, expect, it } from "vitest";
import {
  filterByContentRatings,
  contentRatingsOnList,
} from "./content-ratings";

describe("contentRatingsOnList", () => {
  it("returns sorted unique ratings from list items", () => {
    expect(
      contentRatingsOnList([
        { contentRating: "PG-13" },
        { contentRating: "R" },
        { contentRating: "PG-13" },
      ]),
    ).toEqual(["PG-13", "R"]);
  });
});

describe("filterByContentRatings", () => {
  it("returns all items when no ratings are selected", () => {
    const items = [{ contentRating: "PG" }, { contentRating: "R" }];
    expect(filterByContentRatings(items, [])).toEqual(items);
  });

  it("filters to selected content ratings", () => {
    expect(
      filterByContentRatings(
        [{ contentRating: "PG" }, { contentRating: "R" }],
        ["R"],
      ).map((item) => item.contentRating),
    ).toEqual(["R"]);
  });
});
