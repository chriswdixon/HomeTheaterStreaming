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

  const cachedFlatrateProviders = await deps.tmdb.getWatchProviders(
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
    cachedFlatrateProviders,
    addedByUserId: input.addedByUserId,
  });

  return { ok: true, item };
}

export type RecommendationPayload =
  | { unlocked: false; count: number; needed: number }
  | { unlocked: true; count: number; needed: number; groups: RecommendationGroup[] };

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
    personal.map((item) => deps.tmdb.getMovieRecommendations(item.tmdbMovieId)),
  );

  const uniqueIds = new Set<number>();
  for (const set of recSets) {
    for (const rec of set) {
      if (!excludedTmdbIds.has(rec.tmdbMovieId) && rec.providers.length === 0) {
        uniqueIds.add(rec.tmdbMovieId);
      }
    }
  }

  const providersById = new Map<number, Provider[]>();
  await Promise.all(
    [...uniqueIds].map(async (id) => {
      providersById.set(id, await deps.tmdb.getWatchProviders(id, input.region));
    }),
  );

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
    item.cachedFlatrateProviders,
    new Set(effective.map((provider) => provider.tmdbProviderId)),
  );
}
