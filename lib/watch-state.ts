export type WatchState = {
  watchlistItemId: string;
  rating: number;
  watchedAt: string;
};

export function upsertWatchState(
  states: WatchState[],
  next: WatchState,
): WatchState[] {
  if (!Number.isInteger(next.rating) || next.rating < 1 || next.rating > 5) {
    throw new Error("Rating must be an integer from 1 to 5");
  }
  return [
    ...states.filter((state) => state.watchlistItemId !== next.watchlistItemId),
    next,
  ];
}

export function removeWatchState(
  states: WatchState[],
  watchlistItemId: string,
): WatchState[] {
  return states.filter((state) => state.watchlistItemId !== watchlistItemId);
}

export function recentlyWatchedItems<T extends { id: string }>(
  items: T[],
  states: WatchState[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...states]
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt))
    .flatMap((state) => {
      const item = byId.get(state.watchlistItemId);
      return item ? [item] : [];
    });
}
