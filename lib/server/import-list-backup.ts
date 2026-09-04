import type { ListBackupFile } from "../list-backup";
import type { TmdbClient } from "../tmdb";
import type { WatchlistKind } from "../watchlist";
import {
  addWatchlistItem,
  type StoredWatchlistItem,
  type WatchlistStore,
} from "./watchlist-actions";

export async function importListBackup(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  input: {
    list: WatchlistKind;
    ownerUserId: string | null;
    addedByUserId: string;
    region: string;
    backup: ListBackupFile;
  },
): Promise<{
  added: number;
  skipped: number;
  failed: number;
  items: StoredWatchlistItem[];
}> {
  let added = 0;
  let skipped = 0;
  let failed = 0;
  const items: StoredWatchlistItem[] = [];

  for (const movie of input.backup.items) {
    try {
      const result = await addWatchlistItem(deps, {
        list: input.list,
        ownerUserId: input.ownerUserId,
        addedByUserId: input.addedByUserId,
        region: input.region,
        movie: {
          tmdbMovieId: movie.tmdbMovieId,
          mediaType: movie.mediaType,
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          overview: movie.overview,
        },
      });

      if (!result.ok) {
        skipped += 1;
        continue;
      }

      const item = movie.folderName
        ? await deps.store.updateItem(result.item.id, {
            folderName: movie.folderName,
          })
        : result.item;

      added += 1;
      items.push(item);
    } catch {
      failed += 1;
    }
  }

  return { added, skipped, failed, items };
}
