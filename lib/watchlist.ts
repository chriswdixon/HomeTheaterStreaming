import type { MediaType } from "./media";

export type WatchlistKind = "personal" | "shared";

export type WatchlistIdentity = {
  list: WatchlistKind;
  ownerUserId: string | null;
  tmdbMovieId: number;
  mediaType?: MediaType;
};

export function isDuplicateWatchlistItem(
  existing: WatchlistIdentity[],
  candidate: WatchlistIdentity,
): boolean {
  const candidateType = candidate.mediaType ?? "movie";
  return existing.some((item) => {
    const itemType = item.mediaType ?? "movie";
    if (item.tmdbMovieId !== candidate.tmdbMovieId) return false;
    if (itemType !== candidateType) return false;
    if (item.list !== candidate.list) return false;
    if (candidate.list === "shared") return true;
    return item.ownerUserId === candidate.ownerUserId;
  });
}
