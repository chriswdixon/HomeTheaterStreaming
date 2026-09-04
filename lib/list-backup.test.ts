import { describe, expect, it } from "vitest";
import {
  buildListBackup,
  listBackupFileName,
  listImportMessage,
  parseListBackup,
} from "./list-backup";

const matrix = {
  mediaType: "movie" as const,
  tmdbMovieId: 603,
  title: "The Matrix",
  year: "1999",
  posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  overview:
    "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
  folderName: null,
};

describe("buildListBackup", () => {
  it("serializes only backup fields in the approved v1 shape", () => {
    const backup = buildListBackup({
      list: "personal",
      name: "My List",
      exportedAt: "2026-09-04T21:26:00.000Z",
      items: [
        {
          ...matrix,
          id: "internal-id",
          list: "personal",
          ownerUserId: "user-1",
          sortOrder: 3,
          voteCount: 4,
        },
        {
          mediaType: "tv",
          tmdbMovieId: 1396,
          title: "Breaking Bad",
          year: "2008",
          posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
          overview: "A chemistry teacher.",
          folderName: null,
        },
        {
          mediaType: "movie",
          tmdbMovieId: 11,
          title: "Star Wars",
          year: "1977",
          posterPath: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
          overview: "A long time ago.",
          folderName: "Star Wars",
        },
      ],
    });

    expect(backup).toEqual({
      format: "screenstack-list",
      version: 1,
      exportedAt: "2026-09-04T21:26:00.000Z",
      list: "personal",
      name: "My List",
      items: [
        matrix,
        {
          mediaType: "tv",
          tmdbMovieId: 1396,
          title: "Breaking Bad",
          year: "2008",
          posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
          overview: "A chemistry teacher.",
          folderName: null,
        },
        {
          mediaType: "movie",
          tmdbMovieId: 11,
          title: "Star Wars",
          year: "1977",
          posterPath: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
          overview: "A long time ago.",
          folderName: "Star Wars",
        },
      ],
    });
  });
});

describe("parseListBackup", () => {
  const valid = {
    format: "screenstack-list",
    version: 1,
    exportedAt: "2026-09-04T21:26:00.000Z",
    list: "shared",
    name: "Dixon family",
    items: [matrix],
  };

  it("accepts a valid v1 file", () => {
    expect(parseListBackup(valid)).toEqual({ ok: true, backup: valid });
  });

  it("accepts an empty items array", () => {
    expect(parseListBackup({ ...valid, items: [] })).toEqual({
      ok: true,
      backup: { ...valid, items: [] },
    });
  });

  it("rejects the wrong format marker", () => {
    expect(parseListBackup({ ...valid, format: "letterboxd" })).toEqual({
      ok: false,
      error: "Not a ScreenStack list backup",
    });
  });

  it("rejects an unsupported version", () => {
    expect(parseListBackup({ ...valid, version: 2 })).toEqual({
      ok: false,
      error: "Unsupported backup version",
    });
  });

  it("rejects a missing required item field", () => {
    expect(
      parseListBackup({
        ...valid,
        items: [{ ...matrix, tmdbMovieId: undefined }],
      }),
    ).toEqual({
      ok: false,
      error: "Backup items are invalid",
    });
  });
});

describe("listImportMessage", () => {
  it("reports a merge that added and skipped titles", () => {
    expect(listImportMessage({ added: 3, skipped: 2, failed: 0 })).toBe(
      "Added 3 titles, skipped 2 already on the list",
    );
  });

  it("says when every title was already present", () => {
    expect(listImportMessage({ added: 0, skipped: 2, failed: 0 })).toBe(
      "Nothing new to add — those titles are already on the list",
    );
  });
});

describe("listBackupFileName", () => {
  it("slugs the list name and uses the UTC date", () => {
    expect(
      listBackupFileName("Dixon family", new Date("2026-09-04T21:26:00.000Z")),
    ).toBe("dixon-family-2026-09-04.json");
  });
});
