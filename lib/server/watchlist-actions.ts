import { availabilityForViewer } from "../availability";
import { mergeEffectiveServices, type Provider } from "../effective-services";
import type { Genre, Keyword, MediaType } from "../media";
import {
  RECOMMENDATION_UNLOCK_COUNT,
  groupByFranchise,
  isRecommendationsUnlocked,
  type AffinityGroup,
  type RecommendedMovie,
  type WatchOrderGroup,
} from "../recommendations";
import {
  buildWatchOrderMovies,
  collectionOverlapsWatchPath,
  getCuratedWatchOrder,
  getWatchOrderLabel,
  orderMoviesByIds,
  qualifiesForWatchOrder,
  sortByReleaseYear,
} from "../franchise-watch-order";
import { detectSeriesAndFranchises, type SeriesOrFranchise } from "../series";
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
      watchOrderGroups: WatchOrderGroup[];
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

function listedMovieItems(
  items: StoredWatchlistItem[],
  ownerUserId: string,
) {
  return items.filter(
    (item) =>
      item.mediaType === "movie" &&
      (item.list === "shared" ||
        (item.list === "personal" && item.ownerUserId === ownerUserId)),
  );
}

async function buildWatchOrderGroups(
  deps: { tmdb: TmdbClient },
  input: {
    franchiseSeeds: SeriesOrFranchise[];
    listedItems: StoredWatchlistItem[];
    listedIds: Set<number>;
    region: string;
  },
): Promise<{ groups: WatchOrderGroup[]; pathIds: Set<number> }> {
  const pathIds = new Set<number>();
  const groups: WatchOrderGroup[] = [];
  const listedById = new Map(
    input.listedItems.map((item) => [item.tmdbMovieId, item]),
  );

  await settledMap(
    input.franchiseSeeds.filter((seed) =>
      qualifiesForWatchOrder(seed.seedTmdbIds.length),
    ),
    2,
    async (seed) => {
      try {
        const curatedIds = getCuratedWatchOrder(seed.name);
        let orderedTitles =
          curatedIds != null
            ? orderMoviesByIds(
                curatedIds,
                await deps.tmdb.getMoviesByIds(curatedIds),
              )
            : seed.keywordId != null
              ? sortByReleaseYear(
                  await deps.tmdb.discoverByKeyword(seed.keywordId),
                )
              : [];

        if (orderedTitles.length === 0) return;

        for (const title of orderedTitles) {
          pathIds.add(title.tmdbMovieId);
        }

        const movies: RecommendedMovie[] = orderedTitles.map((title) => {
          const listed = listedById.get(title.tmdbMovieId);
          if (listed) {
            return {
              tmdbMovieId: title.tmdbMovieId,
              mediaType: "movie" as const,
              title: listed.title,
              year: listed.year,
              posterPath: listed.posterPath,
              overview: listed.overview,
              providers: listed.cachedFlatrateProviders,
            };
          }
          return { ...title, mediaType: "movie" as const, providers: [] };
        });

        groups.push({
          name: seed.name,
          orderLabel: getWatchOrderLabel(seed.name),
          movies: buildWatchOrderMovies(movies, input.listedIds),
        });
      } catch {
        // Skip a franchise if TMDB fails.
      }
    },
  );

  return { groups, pathIds };
}

async function buildAffinityGroups(
  deps: { tmdb: TmdbClient },
  input: {
    seeds: SeriesOrFranchise[];
    watchOrderNames: Set<string>;
    watchPathIds: Set<number>;
    excludedTmdbIds: Set<number>;
    region: string;
  },
): Promise<AffinityGroup[]> {
  const affinityRaw: { name: string; titles: RecommendedMovie[] }[] = [];

  await settledMap(input.seeds, 3, async (seed) => {
    if (seed.kind === "franchise" && input.watchOrderNames.has(seed.name)) {
      return;
    }

    try {
      const titles =
        seed.collectionId != null
          ? await deps.tmdb.getCollectionParts(seed.collectionId)
          : seed.keywordId != null
            ? await deps.tmdb.discoverByKeyword(seed.keywordId)
            : [];

      const titleIds = titles.map((title) => title.tmdbMovieId);
      if (collectionOverlapsWatchPath(titleIds, input.watchPathIds)) {
        return;
      }

      affinityRaw.push({
        name: seed.name,
        titles: titles.slice(0, 12).map((title) => ({ ...title, providers: [] })),
      });
    } catch {
      // Skip a collection/franchise if TMDB fails.
    }
  });

  const providersById = new Map<number, Provider[]>();
  const toHydrate = affinityRaw
    .flatMap((group) => group.titles)
    .filter((title) => !input.excludedTmdbIds.has(title.tmdbMovieId))
    .slice(0, MAX_WATCH_PROVIDER_LOOKUPS);

  await settledMap(toHydrate, WATCH_PROVIDER_CONCURRENCY, async (title) => {
    if (providersById.has(title.tmdbMovieId)) return;
    const watch = await deps.tmdb.getWatchProviders(
      title.tmdbMovieId,
      input.region,
      title.mediaType ?? "movie",
    );
    providersById.set(title.tmdbMovieId, watch.flatrate);
  });

  return groupByFranchise({
    groups: affinityRaw.map((group) => ({
      name: group.name,
      movies: group.titles.map((title) => ({
        ...title,
        providers: providersById.get(title.tmdbMovieId) ?? [],
      })),
    })),
    excludedTmdbIds: input.excludedTmdbIds,
  });
}

export async function getRecommendationPayload(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  input: {
    ownerUserId: string;
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
  const listedMovieRows = listedMovieItems(items, input.ownerUserId);

  const catalog = personal
    .filter((item) => item.mediaType === "movie")
    .map((item) => ({
      tmdbMovieId: item.tmdbMovieId,
      collectionId: item.collectionId,
      collectionName: item.collectionName,
      keywords: item.keywords,
    }));

  const detected = detectSeriesAndFranchises(catalog);
  const franchiseSeeds = detected.filter((seed) => seed.kind === "franchise");
  const leftoverSeeds = detected.filter(
    (seed) =>
      seed.kind === "collection" ||
      (seed.kind === "franchise" && !qualifiesForWatchOrder(seed.seedTmdbIds.length)),
  );

  const { groups: watchOrderGroups, pathIds: watchPathIds } =
    await buildWatchOrderGroups(deps, {
      franchiseSeeds: franchiseSeeds.slice(0, 5),
      listedItems: listedMovieRows,
      listedIds: excludedTmdbIds,
      region: input.region,
    });

  const watchOrderNames = new Set(watchOrderGroups.map((group) => group.name));

  const providersById = new Map<number, Provider[]>();
  const toHydrateWatchOrder = watchOrderGroups
    .flatMap((group) => group.movies)
    .filter((movie) => !movie.onList)
    .slice(0, MAX_WATCH_PROVIDER_LOOKUPS);

  await settledMap(toHydrateWatchOrder, WATCH_PROVIDER_CONCURRENCY, async (movie) => {
    if (providersById.has(movie.tmdbMovieId)) return;
    const watch = await deps.tmdb.getWatchProviders(
      movie.tmdbMovieId,
      input.region,
      movie.mediaType ?? "movie",
    );
    providersById.set(movie.tmdbMovieId, watch.flatrate);
  });

  for (const group of watchOrderGroups) {
    group.movies = group.movies.map((movie) => ({
      ...movie,
      providers: movie.onList
        ? movie.providers
        : (providersById.get(movie.tmdbMovieId) ?? movie.providers),
    }));
  }

  const affinityGroups = await buildAffinityGroups(deps, {
    seeds: leftoverSeeds.slice(0, 5),
    watchOrderNames,
    watchPathIds,
    excludedTmdbIds,
    region: input.region,
  });

  return { unlocked: true, count, needed, watchOrderGroups, affinityGroups };
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
    {
      title: item.title,
      tmdbMovieId: item.tmdbMovieId,
      mediaType: item.mediaType,
    },
  );
}
