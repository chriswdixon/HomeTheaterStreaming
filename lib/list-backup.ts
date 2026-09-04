import type { MediaType } from "./media";
import type { WatchlistKind } from "./watchlist";

export const LIST_BACKUP_FORMAT = "screenstack-list";
export const LIST_BACKUP_VERSION = 1;

export type ListBackupItem = {
  mediaType: MediaType;
  tmdbMovieId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  folderName: string | null;
};

export type ListBackupFile = {
  format: typeof LIST_BACKUP_FORMAT;
  version: typeof LIST_BACKUP_VERSION;
  exportedAt: string;
  list: WatchlistKind;
  name: string;
  items: ListBackupItem[];
};

export type ListBackupSourceItem = {
  mediaType: MediaType;
  tmdbMovieId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  folderName: string | null;
};

export function buildListBackup(input: {
  list: WatchlistKind;
  name: string;
  exportedAt: string;
  items: ListBackupSourceItem[];
}): ListBackupFile {
  return {
    format: LIST_BACKUP_FORMAT,
    version: LIST_BACKUP_VERSION,
    exportedAt: input.exportedAt,
    list: input.list,
    name: input.name,
    items: input.items.map((item) => ({
      mediaType: item.mediaType,
      tmdbMovieId: item.tmdbMovieId,
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
      overview: item.overview,
      folderName: item.folderName,
    })),
  };
}

export function parseListBackup(
  raw: unknown,
): { ok: true; backup: ListBackupFile } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Not a ScreenStack list backup" };
  }

  const value = raw as Record<string, unknown>;
  if (value.format !== LIST_BACKUP_FORMAT) {
    return { ok: false, error: "Not a ScreenStack list backup" };
  }
  if (value.version !== LIST_BACKUP_VERSION) {
    return { ok: false, error: "Unsupported backup version" };
  }
  if (
    typeof value.exportedAt !== "string" ||
    (value.list !== "personal" && value.list !== "shared") ||
    typeof value.name !== "string" ||
    !Array.isArray(value.items)
  ) {
    return { ok: false, error: "Not a ScreenStack list backup" };
  }

  const items: ListBackupItem[] = [];
  for (const item of value.items) {
    const parsed = parseBackupItem(item);
    if (!parsed) {
      return { ok: false, error: "Backup items are invalid" };
    }
    items.push(parsed);
  }

  return {
    ok: true,
    backup: {
      format: LIST_BACKUP_FORMAT,
      version: LIST_BACKUP_VERSION,
      exportedAt: value.exportedAt,
      list: value.list,
      name: value.name,
      items,
    },
  };
}

export function listImportMessage(result: {
  added: number;
  skipped: number;
  failed: number;
}) {
  if (result.added === 0 && result.failed === 0) {
    return result.skipped > 0
      ? "Nothing new to add — those titles are already on the list"
      : "Nothing to import";
  }

  const parts: string[] = [];
  if (result.added > 0) {
    parts.push(
      `Added ${result.added} ${result.added === 1 ? "title" : "titles"}`,
    );
  }
  if (result.skipped > 0) {
    parts.push(`skipped ${result.skipped} already on the list`);
  }
  if (result.failed > 0) {
    parts.push(`could not add ${result.failed}`);
  }
  return parts.join(", ");
}

export function listBackupFileName(name: string, exportedAt: Date) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = exportedAt.toISOString().slice(0, 10);
  return `${slug || "list"}-${date}.json`;
}

function parseBackupItem(raw: unknown): ListBackupItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (item.mediaType !== "movie" && item.mediaType !== "tv") return null;
  if (typeof item.tmdbMovieId !== "number" || !Number.isFinite(item.tmdbMovieId)) {
    return null;
  }
  if (typeof item.title !== "string") return null;
  if (item.year !== null && typeof item.year !== "string") return null;
  if (item.posterPath !== null && typeof item.posterPath !== "string") {
    return null;
  }
  if (typeof item.overview !== "string") return null;
  if (item.folderName !== null && typeof item.folderName !== "string") {
    return null;
  }

  return {
    mediaType: item.mediaType,
    tmdbMovieId: item.tmdbMovieId,
    title: item.title,
    year: item.year,
    posterPath: item.posterPath,
    overview: item.overview,
    folderName: item.folderName,
  };
}
