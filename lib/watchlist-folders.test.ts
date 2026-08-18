import { describe, expect, it } from "vitest";
import {
  franchiseSortOrders,
  layoutWatchlistFolders,
} from "./watchlist-folders";

type Item = {
  id: string;
  folderName: string | null;
  folderOrder: number | null;
  sortOrder: number;
};

describe("layoutWatchlistFolders", () => {
  it("groups foldered titles and keeps watch order inside the folder", () => {
    const sections = layoutWatchlistFolders<Item>([
      {
        id: "solo",
        folderName: null,
        folderOrder: null,
        sortOrder: 5,
      },
      {
        id: "mcu-3",
        folderName: "Marvel Cinematic Universe",
        folderOrder: 3,
        sortOrder: 2,
      },
      {
        id: "mcu-1",
        folderName: "Marvel Cinematic Universe",
        folderOrder: 1,
        sortOrder: 0,
      },
      {
        id: "mcu-2",
        folderName: "Marvel Cinematic Universe",
        folderOrder: 2,
        sortOrder: 1,
      },
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0]?.type).toBe("folder");
    if (sections[0]?.type === "folder") {
      expect(sections[0].folder.name).toBe("Marvel Cinematic Universe");
      expect(sections[0].folder.items.map((item) => item.id)).toEqual([
        "mcu-1",
        "mcu-2",
        "mcu-3",
      ]);
    }
    expect(sections[1]?.type).toBe("items");
  });
});

describe("franchiseSortOrders", () => {
  it("places a new franchise block before existing list items", () => {
    expect(franchiseSortOrders(3, [0, 1, 2])).toEqual([-3, -2, -1]);
  });
});
