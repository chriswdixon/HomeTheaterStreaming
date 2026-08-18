import { describe, expect, it } from "vitest";
import { sortSharedListItems } from "./shared-list-votes";

describe("shared list vote sorting", () => {
  it("sorts by vote count descending, then sort order", () => {
    const sorted = sortSharedListItems([
      { id: "a", voteCount: 1, votedByCurrentUser: false, sortOrder: 0 },
      { id: "b", voteCount: 3, votedByCurrentUser: true, sortOrder: 5 },
      { id: "c", voteCount: 3, votedByCurrentUser: false, sortOrder: 1 },
      { id: "d", voteCount: 0, votedByCurrentUser: false, sortOrder: -1 },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["c", "b", "a", "d"]);
  });
});
