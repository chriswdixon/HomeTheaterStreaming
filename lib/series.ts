import type { Keyword } from "./media";

export type CatalogTitle = {
  tmdbMovieId: number;
  collectionId: number | null;
  collectionName: string | null;
  keywords: Keyword[];
};

export type SeriesOrFranchise = {
  kind: "collection" | "franchise";
  id: string;
  name: string;
  seedTmdbIds: number[];
  collectionId: number | null;
  keywordId: number | null;
};

const FRANCHISE_LABELS: { pattern: RegExp; name: string }[] = [
  { pattern: /marvel cinematic universe/i, name: "Marvel Cinematic Universe" },
  { pattern: /\bstar wars\b/i, name: "Star Wars" },
  { pattern: /wizarding world|harry potter/i, name: "Wizarding World" },
  { pattern: /middle-earth|lord of the rings|\bhobbit\b/i, name: "Middle-earth" },
  { pattern: /fast and furious|fast & furious/i, name: "Fast & Furious" },
  { pattern: /\b(james bond|007)\b/i, name: "James Bond" },
  { pattern: /dc extended universe|dc universe/i, name: "DC Universe" },
];

function franchiseName(keywordName: string): string | null {
  return FRANCHISE_LABELS.find((entry) => entry.pattern.test(keywordName))?.name ?? null;
}

export function detectSeriesAndFranchises(
  titles: CatalogTitle[],
): SeriesOrFranchise[] {
  const collections = new Map<number, SeriesOrFranchise>();
  for (const title of titles) {
    if (title.collectionId == null || !title.collectionName) continue;
    const existing = collections.get(title.collectionId);
    if (existing) {
      existing.seedTmdbIds.push(title.tmdbMovieId);
      continue;
    }
    collections.set(title.collectionId, {
      kind: "collection",
      id: `collection-${title.collectionId}`,
      name: title.collectionName,
      seedTmdbIds: [title.tmdbMovieId],
      collectionId: title.collectionId,
      keywordId: null,
    });
  }

  const franchises = new Map<number, SeriesOrFranchise>();
  for (const title of titles) {
    for (const keyword of title.keywords) {
      const name = franchiseName(keyword.name);
      if (!name) continue;
      const existing = franchises.get(keyword.tmdbKeywordId);
      if (existing) {
        if (!existing.seedTmdbIds.includes(title.tmdbMovieId)) {
          existing.seedTmdbIds.push(title.tmdbMovieId);
        }
        continue;
      }
      franchises.set(keyword.tmdbKeywordId, {
        kind: "franchise",
        id: `franchise-${keyword.tmdbKeywordId}`,
        name,
        seedTmdbIds: [title.tmdbMovieId],
        collectionId: null,
        keywordId: keyword.tmdbKeywordId,
      });
    }
  }

  return [...collections.values(), ...franchises.values()].filter(
    (group) => group.seedTmdbIds.length >= 2,
  );
}
