import type { Provider } from "./effective-services";

export type RecommendationServiceFilter = "my-services" | "all";

export function isOnViewerServices(
  flatrate: Provider[],
  services: Provider[],
): boolean {
  if (services.length === 0) return false;
  const serviceIds = new Set(services.map((provider) => provider.tmdbProviderId));
  return flatrate.some((provider) => serviceIds.has(provider.tmdbProviderId));
}

export function filterByViewerServices<T extends {
  providers: Provider[];
  onList?: boolean;
}>(
  movies: T[],
  filter: RecommendationServiceFilter,
  services: Provider[],
): T[] {
  if (filter === "all") return movies;
  return movies.filter(
    (movie) => movie.onList || isOnViewerServices(movie.providers, services),
  );
}
