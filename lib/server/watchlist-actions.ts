import { availabilityForViewer } from "../availability";
import { mergeEffectiveServices, type Provider } from "../effective-services";
import type { Genre, Keyword, MediaType } from "../media";
import {
  RECOMMENDATION_UNLOCK_COUNT,
  isRecommendationsUnlocked,
  rankAndGroupRecommendations,
  type AffinityGroup,
  type RecommendationGroup,
  type RecommendedMovie,
} from "../recommendations";
import { detectSeriesAndFranchises } from "../series";
import type { TmdbClient } from "../tmdb";
import { isDuplicateWatchlistItem, type WatchlistKind } from "../watchlist";

export type StoredWatchlistItem = {
  id: string;
  list: WatchlistKind;
  ownerUserId: string | null;
  mediaType: MediaType;
  tmdbMovieId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  genres: Genre[];
  keywords: Keyword[];
  collectionId: number | null;
  collectionName: string | null;
  sortOrder: number;
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
  mediaType?: MediaType;
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
  const mediaType = input.movie.mediaType ?? "movie";
  const existing = await deps.store.listItems();
  if (
    isDuplicateWatchlistItem(existing, {
      list: input.list,
      ownerUserId: input.ownerUserId,
      tmdbMovieId: input.movie.tmdbMovieId,
      mediaType,
    })
  ) {
    return { ok: false, error: "duplicate" };
  }

  const sameList = existing.filter((item) =>
    input.list === "shared"
      ? item.list === "shared"
      : item.list === "personal" && item.ownerUserId === input.ownerUserId,
  );
  const sortOrder =
    sameList.reduce((min, item) => Math.min(min, item.sortOrder), 0) - 1;

  const [watch, meta] = await Promise.all([
    deps.tmdb.getWatchProviders(
      input.movie.tmdbMovieId,
      input.region,
      mediaType,
    ),
    deps.tmdb.getTitleMeta(input.movie.tmdbMovieId, mediaType),
  ]);

  const item = await deps.store.insertItem({
    list: input.list,
    ownerUserId: input.ownerUserId,
    mediaType,
    tmdbMovieId: input.movie.tmdbMovieId,
    title: input.movie.title,
    year: input.movie.year,
    posterPath: input.movie.posterPath,
    overview: input.movie.overview,
    genres: meta.genres,
    keywords: meta.keywords,
    collectionId: meta.collectionId,
    collectionName: meta.collectionName,
    sortOrder,
    cachedFlatrateProviders: watch.flatrate,
    cachedRentProviders: watch.rent,
    watchUrl: watch.watchUrl,
    addedByUserId: input.addedByUserId,
  });

  return { ok: true, item };
}

export type RecommendationPayload =
  | { unlocked: false; count: number; needed: number }
  | {
      unlocked: true;
      count: number;
      needed: number;
      groups: RecommendationGroup[];
      affinityGroups: AffinityGroup[];
    };

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

  const listed = items.filter(
    (item) =>
      item.list === "shared" ||
      (item.list === "personal" && item.ownerUserId === input.ownerUserId),
  );
  const excludedTmdbIds = new Set(listed.map((item) => item.tmdbMovieId));
  const effectiveProviderIds = new Set(
    input.effectiveProviders.map((provider) => provider.tmdbProviderId),
  );

  const recSets = await Promise.all(
    personal.map(async (item) => {
      try {
        return await deps.tmdb.getTitleRecommendations(
          item.tmdbMovieId,
          item.mediaType,
        );
      } catch {
        return [];
      }
    }),
  );

  const frequency = new Map<number, RecommendedMovie>();
  const scores = new Map<number, number>();
  for (const set of recSets) {
    const seenInSet = new Set<number>();
    for (const rec of set) {
      if (excludedTmdbIds.has(rec.tmdbMovieId) || rec.providers.length > 0) {
        continue;
      }
      if (seenInSet.has(rec.tmdbMovieId)) continue;
      seenInSet.add(rec.tmdbMovieId);
      frequency.set(rec.tmdbMovieId, rec);
      scores.set(rec.tmdbMovieId, (scores.get(rec.tmdbMovieId) ?? 0) + 1);
    }
  }

  const uniqueRecs = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, MAX_WATCH_PROVIDER_LOOKUPS)
    .flatMap(([id]) => {
      const rec = frequency.get(id);
      return rec ? [rec] : [];
    });

  const seeds = detectSeriesAndFranchises(
    personal
      .filter((item) => item.mediaType === "movie")
      .map((item) => ({
        tmdbMovieId: item.tmdbMovieId,
        collectionId: item.collectionId,
        collectionName: item.collectionName,
        keywords: item.keywords,
      })),
  ).slice(0, 5);

  const affinityRaw: { name: string; titles: RecommendedMovie[] }[] = [];
  await settledMap(seeds, 3, async (seed) => {
    try {
      const titles =
        seed.collectionId != null
          ? await deps.tmdb.getCollectionParts(seed.collectionId)
          : seed.keywordId != null
            ? await deps.tmdb.discoverByKeyword(seed.keywordId)
            : [];
      affinityRaw.push({
        name: seed.name,
        titles: titles
          .filter((title) => !excludedTmdbIds.has(title.tmdbMovieId))
          .slice(0, 12)
          .map((title) => ({ ...title, providers: [] })),
      });
    } catch {
      // Skip a collection/franchise if TMDB fails.
    }
  });

  const providersById = new Map<number, Provider[]>();
  const toHydrate = [
    ...uniqueRecs,
    ...affinityRaw.flatMap((group) => group.titles),
  ];
  await settledMap(toHydrate, WATCH_PROVIDER_CONCURRENCY, async (title) => {
    if (providersById.has(title.tmdbMovieId)) return;
    const watch = await deps.tmdb.getWatchProviders(
      title.tmdbMovieId,
      input.region,
      title.mediaType ?? "movie",
    );
    providersById.set(title.tmdbMovieId, watch.flatrate);
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
    effectiveProviderIds,
  });

  const affinityGroups: AffinityGroup[] = affinityRaw
    .map((group) => {
      const movies = group.titles
        .map((title) => ({
          ...title,
          providers: providersById.get(title.tmdbMovieId) ?? [],
          score: 3,
        }))
        .filter((movie) =>
          movie.providers.some((provider) =>
            effectiveProviderIds.has(provider.tmdbProviderId),
          ),
        )
        .slice(0, 8);
      return { name: group.name, movies };
    })
    .filter((group) => group.movies.length > 0);

  return { unlocked: true, count, needed, groups, affinityGroups };
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
