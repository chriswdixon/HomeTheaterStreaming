export type FolderedWatchlistItem = {
  id: string;
  folderName: string | null;
  folderOrder: number | null;
  sortOrder: number;
};

export type WatchlistFolderGroup<T extends FolderedWatchlistItem> = {
  name: string;
  items: T[];
  sortOrder: number;
};

export type WatchlistLayoutSection<T extends FolderedWatchlistItem> =
  | { type: "folder"; folder: WatchlistFolderGroup<T> }
  | { type: "items"; items: T[]; sortOrder: number };

export function layoutWatchlistFolders<T extends FolderedWatchlistItem>(
  items: T[],
): WatchlistLayoutSection<T>[] {
  const folders = new Map<string, T[]>();
  const loose: T[] = [];

  for (const item of items) {
    if (item.folderName) {
      const group = folders.get(item.folderName) ?? [];
      group.push(item);
      folders.set(item.folderName, group);
    } else {
      loose.push(item);
    }
  }

  const folderSections: WatchlistLayoutSection<T>[] = [
    ...folders.entries(),
  ].map(([name, folderItems]) => ({
    type: "folder" as const,
    folder: {
      name,
      items: [...folderItems].sort(
        (a, b) =>
          (a.folderOrder ?? Number.MAX_SAFE_INTEGER) -
            (b.folderOrder ?? Number.MAX_SAFE_INTEGER) ||
          a.sortOrder - b.sortOrder,
      ),
      sortOrder: Math.min(...folderItems.map((item) => item.sortOrder)),
    },
  }));

  const looseSection: WatchlistLayoutSection<T> | null =
    loose.length > 0
      ? {
          type: "items",
          items: [...loose].sort((a, b) => a.sortOrder - b.sortOrder),
          sortOrder: Math.min(...loose.map((item) => item.sortOrder)),
        }
      : null;

  return [...folderSections, ...(looseSection ? [looseSection] : [])].sort(
    (a, b) =>
      (a.type === "folder" ? a.folder.sortOrder : a.sortOrder) -
      (b.type === "folder" ? b.folder.sortOrder : b.sortOrder),
  );
}

export function franchiseSortOrders(
  movieCount: number,
  existingSortOrders: number[],
): number[] {
  const base = existingSortOrders.reduce(
    (min, value) => Math.min(min, value),
    0,
  );
  const start = base - movieCount;
  return Array.from({ length: movieCount }, (_, index) => start + index);
}
