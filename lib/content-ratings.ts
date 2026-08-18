const RATING_ORDER = [
  "G",
  "PG",
  "PG-13",
  "R",
  "NC-17",
  "NR",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
  "TV-MA",
  "Unrated",
] as const;

export function normalizeContentRating(
  rating: string | null | undefined,
): string | null {
  if (!rating) return null;
  const trimmed = rating.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sortContentRatings(ratings: string[]): string[] {
  const order = new Map<string, number>(
    RATING_ORDER.map((rating, index) => [rating, index]),
  );
  return [...ratings].sort((a, b) => {
    const left = order.get(a) ?? Number.MAX_SAFE_INTEGER;
    const right = order.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (left !== right) return left - right;
    return a.localeCompare(b);
  });
}

export function contentRatingsOnList<
  T extends { contentRating?: string | null },
>(items: T[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const rating = normalizeContentRating(item.contentRating);
    if (rating) seen.add(rating);
  }
  return sortContentRatings([...seen]);
}

export function filterByContentRatings<
  T extends { contentRating?: string | null },
>(items: T[], selectedRatings: string[]): T[] {
  if (selectedRatings.length === 0) return items;
  const allowed = new Set(selectedRatings);
  return items.filter((item) => {
    const rating = normalizeContentRating(item.contentRating);
    return rating != null && allowed.has(rating);
  });
}
