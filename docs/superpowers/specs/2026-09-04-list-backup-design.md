# List backup export and import

## Decisions

- My List and the active shared list can be exported and imported.
- Format is versioned JSON (`format: "screenstack-list"`, `version: 1`).
- Export is the full list, not the current filtered view.
- Import always targets the list you are viewing. The file’s `list` field is metadata only.
- Import merges: add missing titles, skip duplicates (`mediaType` + `tmdbMovieId`). Never replace or delete.
- Any household member can import into the shared list (same as adding a title).
- Restore does not write votes, watch ratings, availability, internal ids, or sort order.
- New titles use the existing add-to-list path (fresh TMDB metadata). `folderName` is restored on newly added titles only.
- Filename: `{slug(name)}-YYYY-MM-DD.json`.

## File shape

```json
{
  "format": "screenstack-list",
  "version": 1,
  "exportedAt": "2026-09-04T21:26:00.000Z",
  "list": "personal",
  "name": "My List",
  "items": [
    {
      "mediaType": "movie",
      "tmdbMovieId": 603,
      "title": "The Matrix",
      "year": "1999",
      "posterPath": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      "overview": "…",
      "folderName": null
    }
  ]
}
```

Shared files use `"list": "shared"` and `"name"` as the household name.

## UI

- Export and Import sit in the list page header, next to the title count.
- Export downloads JSON from the already-loaded full list.
- Import opens a `.json` file picker, validates the file, then posts it to one import API.

## API

`POST /api/watchlist/import`

- Auth: signed-in household member.
- Body: `{ list: "personal" | "shared", backup: <file> }`.
- Response: `{ added, skipped, failed, items }` where `items` are newly added rows.

## Errors

- Invalid JSON / wrong `format` / unsupported `version` / malformed items: 400, no writes.
- A single TMDB/add failure does not abort the rest; it increments `failed`.
