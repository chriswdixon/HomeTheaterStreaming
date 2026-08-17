import { describe, expect, it } from "vitest";
import { isDuplicateWatchlistItem } from "./watchlist";

describe("isDuplicateWatchlistItem", () => {
  it("detects the same movie on a personal list", () => {
    expect(
      isDuplicateWatchlistItem(
        [
          {
            list: "personal",
            ownerUserId: "user-1",
            tmdbMovieId: 42,
          },
        ],
        { list: "personal", ownerUserId: "user-1", tmdbMovieId: 42 },
      ),
    ).toBe(true);
  });

  it("allows the same movie on another person's personal list", () => {
    expect(
      isDuplicateWatchlistItem(
        [
          {
            list: "personal",
            ownerUserId: "user-1",
            tmdbMovieId: 42,
          },
        ],
        { list: "personal", ownerUserId: "user-2", tmdbMovieId: 42 },
      ),
    ).toBe(false);
  });

  it("detects the same movie on the shared household list", () => {
    expect(
      isDuplicateWatchlistItem(
        [{ list: "shared", ownerUserId: null, tmdbMovieId: 7 }],
        { list: "shared", ownerUserId: null, tmdbMovieId: 7 },
      ),
    ).toBe(true);
  });
});
