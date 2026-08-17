import type { Provider } from "./effective-services";
import type { RecommendedMovie } from "./recommendations";

export type TmdbSearchMovie = {
  tmdbMovieId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
};

export type TmdbClient = {
  searchMovies: (query: string) => Promise<TmdbSearchMovie[]>;
  getWatchProviders: (movieId: number, region: string) => Promise<Provider[]>;
  getMovieRecommendations: (movieId: number) => Promise<RecommendedMovie[]>;
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
  title: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
};

type TmdbProviderPayload = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

function mapMovie(payload: TmdbMoviePayload): TmdbSearchMovie {
  return {
    tmdbMovieId: payload.id,
    title: payload.title,
    year: yearFromReleaseDate(payload.release_date),
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

  return {
    async searchMovies(query) {
      const trimmed = query.trim();
      if (!trimmed) return [];
      const data = await tmdbGet<{ results: TmdbMoviePayload[] }>("/search/movie", {
        query: trimmed,
        include_adult: "false",
      });
      return (data.results ?? []).map(mapMovie);
    },

    async getWatchProviders(movieId, region) {
      const data = await tmdbGet<{
        results?: Record<string, { flatrate?: TmdbProviderPayload[] }>;
      }>(`/movie/${movieId}/watch/providers`);
      const regionData = data.results?.[region];
      return (regionData?.flatrate ?? []).map(mapProvider);
    },

    async getMovieRecommendations(movieId) {
      const data = await tmdbGet<{ results: TmdbMoviePayload[] }>(
        `/movie/${movieId}/recommendations`,
      );
      return (data.results ?? []).map((payload) => ({
        ...mapMovie(payload),
        providers: [],
      }));
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
