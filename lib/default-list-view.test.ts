import { describe, expect, it } from "vitest";
import {
  defaultListPath,
  parseDefaultListView,
  watchlistItemKey,
} from "./default-list-view";

describe("default list view helpers", () => {
  it("maps views to paths", () => {
    expect(defaultListPath("personal")).toBe("/my-list");
    expect(defaultListPath("shared")).toBe("/shared");
  });

  it("parses valid default views", () => {
    expect(parseDefaultListView("shared")).toBe("shared");
    expect(parseDefaultListView("personal")).toBe("personal");
    expect(parseDefaultListView("other")).toBeNull();
  });

  it("builds stable watchlist item keys", () => {
    expect(watchlistItemKey(42, "movie")).toBe("movie:42");
    expect(watchlistItemKey(7, "tv")).toBe("tv:7");
  });
});
