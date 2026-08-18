export type SharedListVoteFields = {
  voteCount?: number;
  sortOrder: number;
};

export function compareSharedListItems<T extends SharedListVoteFields>(
  left: T,
  right: T,
): number {
  const voteDiff = (right.voteCount ?? 0) - (left.voteCount ?? 0);
  if (voteDiff !== 0) return voteDiff;
  return left.sortOrder - right.sortOrder;
}

export function sortSharedListItems<T extends SharedListVoteFields>(items: T[]): T[] {
  return [...items].sort(compareSharedListItems);
}

export function maxVoteCount<T extends { voteCount?: number }>(items: T[]): number {
  return items.reduce((max, item) => Math.max(max, item.voteCount ?? 0), 0);
}
