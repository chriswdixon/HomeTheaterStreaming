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
};

export type WatchOptions = {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  watchUrl: string | null;
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
  getTitleMeta: (movieId: number, mediaType: MediaType) => Promise<TitleMeta>;
  getCollectionParts: (collectionId: number) => Promise<TmdbSearchMovie[]>;
  discoverByKeyword: (keywordId: number) => Promise<TmdbSearchMovie[]>;
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
    const data = await tmdbGet<{ results: TmdbMoviePayload[] }>(path);
    return (data.results ?? []).map((payload) => ({
      ...mapTitle(payload, mediaType),
      providers: [],
    }));
  }

  return {
    async searchMovies(query) {
      const trimmed = query.trim();
      if (!trimmed) return [];
      const [movies, shows] = await Promise.all([
        tmdbGet<{ results: TmdbMoviePayload[] }>("/search/movie", {
          query: trimmed,
          include_adult: "false",
        }),
        tmdbGet<{ results: TmdbMoviePayload[] }>("/search/tv", {
          query: trimmed,
          include_adult: "false",
        }),
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
    },

    async getMovieRecommendations(movieId) {
      return recommendations(movieId, "movie");
    },

    async getTitleRecommendations(movieId, mediaType) {
      return recommendations(movieId, mediaType);
    },

    async getTitleMeta(movieId, mediaType) {
      const path = mediaType === "tv" ? `/tv/${movieId}` : `/movie/${movieId}`;
      const data = await tmdbGet<{
        genres?: TmdbGenrePayload[];
        belongs_to_collection?: { id: number; name: string } | null;
        keywords?: {
          keywords?: TmdbKeywordPayload[];
          results?: TmdbKeywordPayload[];
        };
      }>(path, { append_to_response: "keywords" });
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
      };
    },

    async getCollectionParts(collectionId) {
      const data = await tmdbGet<{
        parts?: TmdbMoviePayload[];
      }>(`/collection/${collectionId}`);
      return (data.parts ?? []).map((payload) => mapTitle(payload, "movie"));
    },

    async discoverByKeyword(keywordId) {
      const data = await tmdbGet<{ results: TmdbMoviePayload[] }>("/discover/movie", {
        with_keywords: String(keywordId),
        sort_by: "popularity.desc",
        include_adult: "false",
      });
      return (data.results ?? []).map((payload) => mapTitle(payload, "movie"));
    },

    async listWatchProviders(region) {
      const data = await tmdbGet<{ results: TmdbProviderPayload[] }>(
        "/watch/providers/movie",
        { watch_region: region },
      );
      return (data.results ?? []).map(mapProvider);
    },
  };
}
