import { availabilityForViewer } from "../availability";
import { mergeEffectiveServices, type Provider } from "../effective-services";
import type { Genre, Keyword, MediaType } from "../media";
import {
  RECOMMENDATION_UNLOCK_COUNT,
  groupByFranchise,
  isRecommendationsUnlocked,
  rankGeneralRecommendations,
  type AffinityGroup,
  type RankedMovie,
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
import {
  detectSeriesAndFranchises,
  rankSeedsByListStrength,
  type CatalogTitle,
  type SeriesOrFranchise,
} from "../series";
import type { TmdbClient } from "../tmdb";
import { isDuplicateWatchlistItem, type WatchlistKind } from "../watchlist";
import { franchiseSortOrders } from "../watchlist-folders";
import { mergeRentalProviders } from "../watch-providers";

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
  contentRating: string | null;
  folderName: string | null;
  folderOrder: number | null;
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
  updateItem: (
    id: string,
    patch: Partial<
      Pick<
        StoredWatchlistItem,
        | "folderName"
        | "folderOrder"
        | "sortOrder"
        | "genres"
        | "keywords"
        | "collectionId"
        | "collectionName"
        | "contentRating"
      >
    >,
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
    deps.tmdb.getTitleMeta(input.movie.tmdbMovieId, mediaType, input.region),
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
    contentRating: meta.contentRating,
    folderName: null,
    folderOrder: null,
    sortOrder,
    cachedFlatrateProviders: watch.flatrate,
    cachedRentProviders: mergeRentalProviders(watch.rent, watch.buy),
    watchUrl: watch.watchUrl,
    addedByUserId: input.addedByUserId,
  });

  return { ok: true, item };
}

export type FranchiseMovieInput = MovieInput & {
  order: number;
};

export async function addFranchiseFolderToWatchlist(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  input: {
    list: WatchlistKind;
    ownerUserId: string | null;
    addedByUserId: string;
    region: string;
    folderName: string;
    movies: FranchiseMovieInput[];
  },
): Promise<{ added: number; updated: number; items: StoredWatchlistItem[] }> {
  if (input.movies.length === 0) {
    return { added: 0, updated: 0, items: [] };
  }

  const existing = await deps.store.listItems();
  const sameList = existing.filter((item) =>
    input.list === "shared"
      ? item.list === "shared"
      : item.list === "personal" && item.ownerUserId === input.ownerUserId,
  );
  const sortOrders = franchiseSortOrders(
    input.movies.length,
    sameList.map((item) => item.sortOrder),
  );

  const results: StoredWatchlistItem[] = [];
  let added = 0;
  let updated = 0;

  for (let index = 0; index < input.movies.length; index++) {
    const movie = input.movies[index]!;
    const mediaType = movie.mediaType ?? "movie";
    const sortOrder = sortOrders[index]!;
    const folderOrder = movie.order;
    const duplicate = sameList.find(
      (item) =>
        item.tmdbMovieId === movie.tmdbMovieId && item.mediaType === mediaType,
    );

    if (duplicate) {
      const item = await deps.store.updateItem(duplicate.id, {
        folderName: input.folderName,
        folderOrder,
        sortOrder,
      });
      results.push(item);
      updated++;
      continue;
    }

    const [watch, meta] = await Promise.all([
      deps.tmdb.getWatchProviders(movie.tmdbMovieId, input.region, mediaType),
      deps.tmdb.getTitleMeta(movie.tmdbMovieId, mediaType, input.region),
    ]);

    const item = await deps.store.insertItem({
      list: input.list,
      ownerUserId: input.ownerUserId,
      mediaType,
      tmdbMovieId: movie.tmdbMovieId,
      title: movie.title,
      year: movie.year,
      posterPath: movie.posterPath,
      overview: movie.overview,
      genres: meta.genres,
      keywords: meta.keywords,
      collectionId: meta.collectionId,
      collectionName: meta.collectionName,
      contentRating: meta.contentRating,
      folderName: input.folderName,
      folderOrder,
      sortOrder,
      cachedFlatrateProviders: watch.flatrate,
      cachedRentProviders: mergeRentalProviders(watch.rent, watch.buy),
      watchUrl: watch.watchUrl,
      addedByUserId: input.addedByUserId,
    });
    results.push(item);
    added++;
  }

  return { added, updated, items: results };
}

export type RecommendationPayload =
  | { unlocked: false; count: number; needed: number; degraded?: boolean }
  | {
      unlocked: true;
      count: number;
      needed: number;
      watchOrderGroups: WatchOrderGroup[];
      affinityGroups: AffinityGroup[];
      generalRecs: RankedMovie[];
      degraded?: boolean;
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

async function buildPersonalCatalog(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  personal: StoredWatchlistItem[],
  region: string,
): Promise<CatalogTitle[]> {
  const movies = personal.filter((item) => item.mediaType === "movie");

  return Promise.all(
    movies.map(async (item) => {
      let keywords = item.keywords ?? [];
      let collectionId = item.collectionId;
      let collectionName = item.collectionName;

      if (keywords.length === 0) {
        try {
          const meta = await deps.tmdb.getTitleMeta(item.tmdbMovieId, "movie", region);
          keywords = meta.keywords;
          collectionId = meta.collectionId ?? collectionId;
          collectionName = meta.collectionName ?? collectionName;
          await deps.store.updateItem(item.id, {
            genres: meta.genres,
            keywords: meta.keywords,
            collectionId: meta.collectionId,
            collectionName: meta.collectionName,
            contentRating: meta.contentRating,
          });
        } catch {
          // Keep whatever is already stored.
        }
      }

      return {
        tmdbMovieId: item.tmdbMovieId,
        collectionId,
        collectionName,
        keywords,
      };
    }),
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

  return groupByFranchise({
    groups: affinityRaw.map((group) => ({
      name: group.name,
      movies: group.titles,
    })),
    excludedTmdbIds: input.excludedTmdbIds,
  });
}

async function getDegradedRecommendationPayload(
  deps: { store: WatchlistStore },
  input: { ownerUserId: string },
): Promise<RecommendationPayload> {
  let items: StoredWatchlistItem[] = [];
  try {
    items = await deps.store.listItems();
  } catch {
    items = [];
  }

  const personal = items.filter(
    (item) => item.list === "personal" && item.ownerUserId === input.ownerUserId,
  );
  const count = personal.length;
  const needed = RECOMMENDATION_UNLOCK_COUNT;

  if (!isRecommendationsUnlocked(count)) {
    return { unlocked: false, count, needed, degraded: true };
  }

  return {
    unlocked: true,
    count,
    needed,
    watchOrderGroups: [],
    affinityGroups: [],
    generalRecs: [],
    degraded: true,
  };
}

async function buildRecommendationPayload(
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

  const catalog = await buildPersonalCatalog(deps, personal, input.region);

  const detected = detectSeriesAndFranchises(catalog);
  const franchiseSeeds = rankSeedsByListStrength(
    detected.filter((seed) => seed.kind === "franchise"),
  );
  const leftoverSeeds = rankSeedsByListStrength(
    detected.filter(
      (seed) =>
        seed.kind === "collection" ||
        (seed.kind === "franchise" &&
          !qualifiesForWatchOrder(seed.seedTmdbIds.length)),
    ),
  );

  const { groups: watchOrderGroups, pathIds: watchPathIds } =
    await buildWatchOrderGroups(deps, {
      franchiseSeeds,
      listedItems: listedMovieRows,
      listedIds: excludedTmdbIds,
      region: input.region,
    });

  const watchOrderNames = new Set(watchOrderGroups.map((group) => group.name));

  const providersById = new Map<number, Provider[]>();
  const rentProvidersById = new Map<number, Provider[]>();
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
    rentProvidersById.set(
      movie.tmdbMovieId,
      mergeRentalProviders(watch.rent, watch.buy),
    );
  });

  for (const group of watchOrderGroups) {
    group.movies = group.movies.map((movie) => ({
      ...movie,
      providers: movie.onList
        ? movie.providers
        : (providersById.get(movie.tmdbMovieId) ?? movie.providers),
      rentProviders: movie.onList
        ? movie.rentProviders
        : (rentProvidersById.get(movie.tmdbMovieId) ?? []),
    }));
  }

  const affinityGroups = await buildAffinityGroups(deps, {
    seeds: leftoverSeeds,
    watchOrderNames,
    watchPathIds,
    excludedTmdbIds,
    region: input.region,
  });

  const franchiseTmdbIds = new Set<number>([
    ...watchPathIds,
    ...affinityGroups.flatMap((group) =>
      group.movies.map((movie) => movie.tmdbMovieId),
    ),
  ]);

  const generalRecs = rankGeneralRecommendations({
    recommendationSets: recSets.map((set) =>
      set.map((rec) => ({ ...rec, providers: [] })),
    ),
    excludedTmdbIds,
    excludeTmdbIds: franchiseTmdbIds,
  });

  const toHydrateGeneral = generalRecs.filter(
    (movie) => !providersById.has(movie.tmdbMovieId),
  );
  const remainingLookups = Math.max(
    0,
    MAX_WATCH_PROVIDER_LOOKUPS - providersById.size,
  );

  await settledMap(
    toHydrateGeneral.slice(0, remainingLookups),
    WATCH_PROVIDER_CONCURRENCY,
    async (movie) => {
      if (providersById.has(movie.tmdbMovieId)) return;
      const watch = await deps.tmdb.getWatchProviders(
        movie.tmdbMovieId,
        input.region,
        movie.mediaType ?? "movie",
      );
      providersById.set(movie.tmdbMovieId, watch.flatrate);
      rentProvidersById.set(
        movie.tmdbMovieId,
        mergeRentalProviders(watch.rent, watch.buy),
      );
    },
  );

  const hydratedGeneralRecs = generalRecs.map((movie) => ({
    ...movie,
    providers: providersById.get(movie.tmdbMovieId) ?? [],
    rentProviders: rentProvidersById.get(movie.tmdbMovieId) ?? [],
  }));

  return {
    unlocked: true,
    count,
    needed,
    watchOrderGroups,
    affinityGroups,
    generalRecs: hydratedGeneralRecs,
  };
}

export async function getRecommendationPayload(
  deps: { tmdb: TmdbClient; store: WatchlistStore },
  input: {
    ownerUserId: string;
    region: string;
  },
): Promise<RecommendationPayload> {
  try {
    return await buildRecommendationPayload(deps, input);
  } catch {
    return getDegradedRecommendationPayload(deps, input);
  }
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
