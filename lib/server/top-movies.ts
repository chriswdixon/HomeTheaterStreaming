import type { Provider } from "@/lib/effective-services";
import type { TmdbClient, TmdbSearchMovie } from "@/lib/tmdb";

export const TOP_MOVIES_LIMIT = 100;
const WATCH_PROVIDER_CONCURRENCY = 5;

export type TopMovie = TmdbSearchMovie & {
  rank: number;
  providers: Provider[];
  onPersonalList: boolean;
  onSharedList: boolean;
};

async function hydrateProviders(
  tmdb: TmdbClient,
  movies: TmdbSearchMovie[],
  region: string,
) {
  const providersById = new Map<number, Provider[]>();
  let next = 0;

  async function worker() {
    while (next < movies.length) {
      const index = next++;
      const movie = movies[index];
      if (!movie) return;
      try {
        const watch = await tmdb.getWatchProviders(
          movie.tmdbMovieId,
          region,
          "movie",
        );
        providersById.set(movie.tmdbMovieId, watch.flatrate);
      } catch {
        providersById.set(movie.tmdbMovieId, []);
      }
    }
  }

  const workerCount = Math.min(WATCH_PROVIDER_CONCURRENCY, movies.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return providersById;
}

export async function getTopMoviesPayload(input: {
  tmdb: TmdbClient;
  region: string;
  personalMovieIds: Set<number>;
  sharedMovieIds: Set<number>;
}): Promise<TopMovie[]> {
  const movies = await input.tmdb.getTopRatedMovies(TOP_MOVIES_LIMIT);
  const providersById = await hydrateProviders(input.tmdb, movies, input.region);

  return movies.map((movie, index) => ({
    ...movie,
    rank: index + 1,
    providers: providersById.get(movie.tmdbMovieId) ?? [],
    onPersonalList: input.personalMovieIds.has(movie.tmdbMovieId),
    onSharedList: input.sharedMovieIds.has(movie.tmdbMovieId),
  }));
}
