import type { Provider } from "./effective-services";
import type { Genre, Keyword, MediaType } from "./media";
import type { RecommendedMovie } from "./recommendations";

export type TmdbSearchMovie = {
  tmdbMovieId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
};

export type TitleMeta = {
  genres: Genre[];
  keywords: Keyword[];
  collectionId: number | null;
  collectionName: string | null;
  contentRating: string | null;
};

export type WatchOptions = {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  watchUrl: string | null;
};

export const EMPTY_WATCH_OPTIONS: WatchOptions = {
  flatrate: [],
  rent: [],
  buy: [],
  watchUrl: null,
};

export const EMPTY_TITLE_META: TitleMeta = {
  genres: [],
  keywords: [],
  collectionId: null,
  collectionName: null,
  contentRating: null,
};

export type TmdbClient = {
  searchMovies: (query: string) => Promise<TmdbSearchMovie[]>;
  getWatchProviders: (
    movieId: number,
    region: string,
    mediaType?: MediaType,
  ) => Promise<WatchOptions>;
  getMovieRecommendations: (movieId: number) => Promise<RecommendedMovie[]>;
  getTitleRecommendations: (
    movieId: number,
    mediaType: MediaType,
  ) => Promise<RecommendedMovie[]>;
  getTitleMeta: (movieId: number, mediaType: MediaType, region?: string) => Promise<TitleMeta>;
  getContentRating: (
    movieId: number,
    mediaType: MediaType,
    region?: string,
  ) => Promise<string | null>;
  getCollectionParts: (collectionId: number) => Promise<TmdbSearchMovie[]>;
  discoverByKeyword: (keywordId: number) => Promise<TmdbSearchMovie[]>;
  getMoviesByIds: (ids: number[]) => Promise<TmdbSearchMovie[]>;
  getTopRatedMovies: (limit: number) => Promise<TmdbSearchMovie[]>;
  listWatchProviders: (region: string) => Promise<Provider[]>;
};

const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(
  path: string | null | undefined,
  size: "w92" | "w185" | "w342" | "w500" | "original" = "w342",
): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function yearFromReleaseDate(releaseDate: string | null | undefined): string | null {
  if (!releaseDate || releaseDate.length < 4) return null;
  return releaseDate.slice(0, 4);
}

type TmdbMoviePayload = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  popularity?: number;
  genre_ids?: number[];
};

type TmdbProviderPayload = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

type TmdbGenrePayload = { id: number; name: string };
type TmdbKeywordPayload = { id: number; name: string };

function mapTitle(
  payload: TmdbMoviePayload,
  mediaType: MediaType,
): TmdbSearchMovie {
  return {
    tmdbMovieId: payload.id,
    mediaType,
    title: payload.title ?? payload.name ?? "Untitled",
    year: yearFromReleaseDate(payload.release_date ?? payload.first_air_date),
    posterPath: payload.poster_path ?? null,
    overview: payload.overview ?? "",
  };
}

function mapProvider(payload: TmdbProviderPayload): Provider {
  return {
    tmdbProviderId: payload.provider_id,
    name: payload.provider_name,
    logoPath: payload.logo_path ?? null,
  };
}

function mapWatchOptions(regionData?: {
  link?: string;
  flatrate?: TmdbProviderPayload[];
  rent?: TmdbProviderPayload[];
  buy?: TmdbProviderPayload[];
}): WatchOptions {
  return {
    flatrate: (regionData?.flatrate ?? []).map(mapProvider),
    rent: (regionData?.rent ?? []).map(mapProvider),
    buy: (regionData?.buy ?? []).map(mapProvider),
    watchUrl: regionData?.link ?? null,
  };
}

export function createTmdbClient(
  fetchImpl: typeof fetch = fetch,
  accessToken = process.env.TMDB_ACCESS_TOKEN,
): TmdbClient {
  async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    if (!accessToken) {
      throw new Error("TMDB_ACCESS_TOKEN is not set");
    }

    const url = new URL(`https://api.themoviedb.org/3${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetchImpl(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 6 },
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`TMDB request failed (${response.status}) for ${path}`);
    }

    return (await response.json()) as T;
  }

  async function recommendations(
    id: number,
    mediaType: MediaType,
  ): Promise<RecommendedMovie[]> {
    const path =
      mediaType === "tv" ? `/tv/${id}/recommendations` : `/movie/${id}/recommendations`;
    try {
      const data = await tmdbGet<{ results: TmdbMoviePayload[] }>(path);
      return (data.results ?? []).map((payload) => ({
        ...mapTitle(payload, mediaType),
        providers: [],
      }));
    } catch {
      return [];
    }
  }

  async function contentRatingFor(
    movieId: number,
    mediaType: MediaType,
    region = "US",
  ): Promise<string | null> {
    try {
      if (mediaType === "tv") {
        const data = await tmdbGet<{
          results?: { iso_3166_1?: string; rating?: string }[];
        }>(`/tv/${movieId}/content_ratings`);
        return (
          data.results?.find((entry) => entry.iso_3166_1 === region)?.rating ??
          null
        );
      }

      const data = await tmdbGet<{
        results?: {
          iso_3166_1?: string;
          release_dates?: { certification?: string }[];
        }[];
      }>(`/movie/${movieId}/release_dates`);
      const country = data.results?.find((entry) => entry.iso_3166_1 === region);
      const certification = country?.release_dates
        ?.map((entry) => entry.certification?.trim())
        .find((value) => value);
      return certification || null;
    } catch {
      return null;
    }
  }

  return {
    async searchMovies(query) {
      const trimmed = query.trim();
      if (!trimmed) return [];
      const [movies, shows] = await Promise.all([
        tmdbGet<{ results: TmdbMoviePayload[] }>("/search/movie", {
          query: trimmed,
          include_adult: "false",
        }).catch(() => ({ results: [] as TmdbMoviePayload[] })),
        tmdbGet<{ results: TmdbMoviePayload[] }>("/search/tv", {
          query: trimmed,
          include_adult: "false",
        }).catch(() => ({ results: [] as TmdbMoviePayload[] })),
      ]);
      const combined = [
        ...(movies.results ?? []).map((payload) => ({
          ...mapTitle(payload, "movie"),
          popularity: payload.popularity ?? 0,
        })),
        ...(shows.results ?? []).map((payload) => ({
          ...mapTitle(payload, "tv"),
          popularity: payload.popularity ?? 0,
        })),
      ];
      return combined
        .sort((a, b) => b.popularity - a.popularity)
        .map(({ popularity: _popularity, ...title }) => title);
    },

    async getWatchProviders(movieId, region, mediaType = "movie") {
      const path =
        mediaType === "tv"
          ? `/tv/${movieId}/watch/providers`
          : `/movie/${movieId}/watch/providers`;
      try {
        const data = await tmdbGet<{
          results?: Record<
            string,
            {
              link?: string;
              flatrate?: TmdbProviderPayload[];
              rent?: TmdbProviderPayload[];
              buy?: TmdbProviderPayload[];
            }
          >;
        }>(path);
        return mapWatchOptions(data.results?.[region]);
      } catch {
        return EMPTY_WATCH_OPTIONS;
      }
    },

    async getMovieRecommendations(movieId) {
      return recommendations(movieId, "movie");
    },

    async getTitleRecommendations(movieId, mediaType) {
      return recommendations(movieId, mediaType);
    },

    getContentRating: contentRatingFor,

    async getTitleMeta(movieId, mediaType, region = "US") {
      const path = mediaType === "tv" ? `/tv/${movieId}` : `/movie/${movieId}`;
      try {
        const [data, contentRating] = await Promise.all([
          tmdbGet<{
            genres?: TmdbGenrePayload[];
            belongs_to_collection?: { id: number; name: string } | null;
            keywords?: {
              keywords?: TmdbKeywordPayload[];
              results?: TmdbKeywordPayload[];
            };
          }>(path, { append_to_response: "keywords" }),
          contentRatingFor(movieId, mediaType, region),
        ]);
        const keywordPayload =
          data.keywords?.keywords ?? data.keywords?.results ?? [];
        return {
          genres: (data.genres ?? []).map((genre) => ({
            tmdbGenreId: genre.id,
            name: genre.name,
          })),
          keywords: keywordPayload.map((keyword) => ({
            tmdbKeywordId: keyword.id,
            name: keyword.name,
          })),
          collectionId: data.belongs_to_collection?.id ?? null,
          collectionName: data.belongs_to_collection?.name ?? null,
          contentRating,
        };
      } catch {
        return EMPTY_TITLE_META;
      }
    },

    async getCollectionParts(collectionId) {
      try {
        const data = await tmdbGet<{
          parts?: TmdbMoviePayload[];
        }>(`/collection/${collectionId}`);
        return (data.parts ?? []).map((payload) => mapTitle(payload, "movie"));
      } catch {
        return [];
      }
    },

    async discoverByKeyword(keywordId) {
      try {
        const data = await tmdbGet<{ results: TmdbMoviePayload[] }>("/discover/movie", {
          with_keywords: String(keywordId),
          sort_by: "primary_release_date.asc",
          include_adult: "false",
        });
        return (data.results ?? []).map((payload) => mapTitle(payload, "movie"));
      } catch {
        return [];
      }
    },

    async getMoviesByIds(ids) {
      const unique = [...new Set(ids)];
      const movies = await Promise.all(
        unique.map(async (id) => {
          try {
            const data = await tmdbGet<TmdbMoviePayload>(`/movie/${id}`);
            return mapTitle(data, "movie");
          } catch {
            return null;
          }
        }),
      );
      return movies.filter((movie): movie is TmdbSearchMovie => movie != null);
    },

    async getTopRatedMovies(limit) {
      const movies: TmdbSearchMovie[] = [];
      let page = 1;

      while (movies.length < limit) {
        let data: { results: TmdbMoviePayload[] };
        try {
          data = await tmdbGet<{ results: TmdbMoviePayload[] }>(
            "/movie/top_rated",
            { page: String(page) },
          );
        } catch {
          break;
        }
        const batch = (data.results ?? []).map((payload) =>
          mapTitle(payload, "movie"),
        );
        if (batch.length === 0) break;
        movies.push(...batch);
        page += 1;
      }

      return movies.slice(0, limit);
    },

    async listWatchProviders(region) {
      try {
        const data = await tmdbGet<{ results: TmdbProviderPayload[] }>(
          "/watch/providers/movie",
          { watch_region: region },
        );
        return (data.results ?? []).map(mapProvider);
      } catch {
        return [];
      }
    },
  };
}
