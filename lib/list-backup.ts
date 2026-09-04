import type { Provider } from "./effective-services";
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

export type ListBackupService = {
  tmdbProviderId: number;
  name: string;
  logoPath: string | null;
};

export type ListBackupFile = {
  format: typeof LIST_BACKUP_FORMAT;
  version: typeof LIST_BACKUP_VERSION;
  exportedAt: string;
  list: WatchlistKind;
  name: string;
  services: ListBackupService[];
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
  services?: ListBackupService[];
}): ListBackupFile {
  return {
    format: LIST_BACKUP_FORMAT,
    version: LIST_BACKUP_VERSION,
    exportedAt: input.exportedAt,
    list: input.list,
    name: input.name,
    services: (input.services ?? []).map((service) => ({
      tmdbProviderId: service.tmdbProviderId,
      name: service.name,
      logoPath: service.logoPath,
    })),
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

  const services: ListBackupService[] = [];
  if (value.services !== undefined) {
    if (!Array.isArray(value.services)) {
      return { ok: false, error: "Backup services are invalid" };
    }
    for (const service of value.services) {
      const parsed = parseBackupService(service);
      if (!parsed) {
        return { ok: false, error: "Backup services are invalid" };
      }
      services.push(parsed);
    }
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
      services,
      items,
    },
  };
}

export function listImportMessage(result: {
  added: number;
  skipped: number;
  failed: number;
  servicesAdded?: number;
}) {
  const servicesAdded = result.servicesAdded ?? 0;
  if (result.added === 0 && result.failed === 0 && servicesAdded === 0) {
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
  if (servicesAdded > 0) {
    parts.push(
      `restored ${servicesAdded} ${servicesAdded === 1 ? "service" : "services"}`,
    );
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

export function backupServicesToAdd(
  incoming: ListBackupService[],
  existing: Pick<Provider, "tmdbProviderId">[],
): ListBackupService[] {
  const have = new Set(existing.map((service) => service.tmdbProviderId));
  return incoming.filter((service) => !have.has(service.tmdbProviderId));
}

function parseBackupService(raw: unknown): ListBackupService | null {
  if (!raw || typeof raw !== "object") return null;
  const service = raw as Record<string, unknown>;
  if (
    typeof service.tmdbProviderId !== "number" ||
    !Number.isFinite(service.tmdbProviderId)
  ) {
    return null;
  }
  if (typeof service.name !== "string") return null;
  if (service.logoPath !== null && typeof service.logoPath !== "string") {
    return null;
  }
  return {
    tmdbProviderId: service.tmdbProviderId,
    name: service.name,
    logoPath: service.logoPath,
  };
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
