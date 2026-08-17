export type WatchlistKind = "personal" | "shared";

export type WatchlistIdentity = {
  list: WatchlistKind;
  ownerUserId: string | null;
  tmdbMovieId: number;
};

export function isDuplicateWatchlistItem(
  existing: WatchlistIdentity[],
  candidate: WatchlistIdentity,
): boolean {
  return existing.some((item) => {
    if (item.tmdbMovieId !== candidate.tmdbMovieId) return false;
    if (item.list !== candidate.list) return false;
    if (candidate.list === "shared") return true;
    return item.ownerUserId === candidate.ownerUserId;
  });
}
