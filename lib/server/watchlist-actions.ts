import { availabilityForViewer } from "../availability";
import { mergeEffectiveServices, type Provider } from "../effective-services";
import {
  RECOMMENDATION_UNLOCK_COUNT,
  isRecommendationsUnlocked,
  rankAndGroupRecommendations,
  type RecommendationGroup,
} from "../recommendations";
import type { TmdbClient } from "../tmdb";
import { isDuplicateWatchlistItem, type WatchlistKind } from "../watchlist";

export type StoredWatchlistItem = {
  id: string;
  list: WatchlistKind;
  ownerUserId: string | null;
  tmdbMovieId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  cachedFlatrateProviders: Provider[];
  cachedRentProviders: Provider[];
  watchUrl: string | null;
  addedByUserId: string;
};

export type WatchlistStore = {
  listItems: () => Promise<StoredWatchlistItem[]>;
  insertItem: (
    item: Omit<StoredWatchlistItem, "id">,
  ) => Promise<StoredWatchlistItem>;
};

export type MovieInput = {
  tmdbMovieId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
};

export async function addWatchlistItem(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  input: {
    list: WatchlistKind;
    ownerUserId: string | null;
    addedByUserId: string;
    region: string;
    movie: MovieInput;
  },
): Promise<
  | { ok: true; item: StoredWatchlistItem }
  | { ok: false; error: "duplicate" }
> {
  const existing = await deps.store.listItems();
  if (
    isDuplicateWatchlistItem(existing, {
      list: input.list,
      ownerUserId: input.ownerUserId,
      tmdbMovieId: input.movie.tmdbMovieId,
    })
  ) {
    return { ok: false, error: "duplicate" };
  }

  const watch = await deps.tmdb.getWatchProviders(
    input.movie.tmdbMovieId,
    input.region,
  );

  const item = await deps.store.insertItem({
    list: input.list,
    ownerUserId: input.ownerUserId,
    tmdbMovieId: input.movie.tmdbMovieId,
    title: input.movie.title,
    year: input.movie.year,
    posterPath: input.movie.posterPath,
    overview: input.movie.overview,
    cachedFlatrateProviders: watch.flatrate,
    cachedRentProviders: watch.rent,
    watchUrl: watch.watchUrl,
    addedByUserId: input.addedByUserId,
  });

  return { ok: true, item };
}

export type RecommendationPayload =
  | { unlocked: false; count: number; needed: number }
  | { unlocked: true; count: number; needed: number; groups: RecommendationGroup[] };

export const MAX_WATCH_PROVIDER_LOOKUPS = 30;
const WATCH_PROVIDER_CONCURRENCY = 5;

async function settledMap<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item === undefined) return;
      try {
        await fn(item);
      } catch {
        // Keep going; one TMDB 429/404 must not fail the whole page.
      }
    }
  }
  if (items.length === 0) return;
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

export async function getRecommendationPayload(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  input: {
    ownerUserId: string;
    effectiveProviders: Provider[];
    region: string;
  },
): Promise<RecommendationPayload> {
  const items = await deps.store.listItems();
  const personal = items.filter(
    (item) => item.list === "personal" && item.ownerUserId === input.ownerUserId,
  );
  const count = personal.length;
  const needed = RECOMMENDATION_UNLOCK_COUNT;

  if (!isRecommendationsUnlocked(count)) {
    return { unlocked: false, count, needed };
  }

  const excludedTmdbIds = new Set(
    items
      .filter(
        (item) =>
          item.list === "shared" ||
          (item.list === "personal" && item.ownerUserId === input.ownerUserId),
      )
      .map((item) => item.tmdbMovieId),
  );

  const recSets = await Promise.all(
    personal.map(async (item) => {
      try {
        return await deps.tmdb.getMovieRecommendations(item.tmdbMovieId);
      } catch {
        return [];
      }
    }),
  );

  const frequency = new Map<number, number>();
  for (const set of recSets) {
    const seenInSet = new Set<number>();
    for (const rec of set) {
      if (excludedTmdbIds.has(rec.tmdbMovieId) || rec.providers.length > 0) {
        continue;
      }
      if (seenInSet.has(rec.tmdbMovieId)) continue;
      seenInSet.add(rec.tmdbMovieId);
      frequency.set(rec.tmdbMovieId, (frequency.get(rec.tmdbMovieId) ?? 0) + 1);
    }
  }

  const uniqueIds = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, MAX_WATCH_PROVIDER_LOOKUPS)
    .map(([id]) => id);

  const providersById = new Map<number, Provider[]>();
  await settledMap(uniqueIds, WATCH_PROVIDER_CONCURRENCY, async (id) => {
    const watch = await deps.tmdb.getWatchProviders(id, input.region);
    providersById.set(id, watch.flatrate);
  });

  const recommendationSets = recSets.map((set) =>
    set.map((rec) => ({
      ...rec,
      providers:
        rec.providers.length > 0
          ? rec.providers
          : (providersById.get(rec.tmdbMovieId) ?? []),
    })),
  );

  const groups = rankAndGroupRecommendations({
    recommendationSets,
    excludedTmdbIds,
    effectiveProviderIds: new Set(
      input.effectiveProviders.map((provider) => provider.tmdbProviderId),
    ),
  });

  return { unlocked: true, count, needed, groups };
}

export function viewerAvailability(
  item: StoredWatchlistItem,
  household: Provider[],
  personal: Provider[],
) {
  const effective = mergeEffectiveServices(household, personal);
  return availabilityForViewer(
    {
      flatrate: item.cachedFlatrateProviders,
      rent: item.cachedRentProviders,
      watchUrl: item.watchUrl,
    },
    effective,
  );
}
