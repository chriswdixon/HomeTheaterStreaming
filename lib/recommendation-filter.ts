import type { Provider } from "./effective-services";
import { rentMatchesService } from "./availability";

export function isOnViewerServices(
  flatrate: Provider[],
  services: Provider[],
): boolean {
  if (services.length === 0) return false;
  const serviceIds = new Set(services.map((provider) => provider.tmdbProviderId));
  return flatrate.some((provider) => serviceIds.has(provider.tmdbProviderId));
}

function matchesSelectedServices(
  flatrate: Provider[],
  rent: Provider[],
  selectedServices: Provider[],
): boolean {
  const selectedIds = new Set(
    selectedServices.map((provider) => provider.tmdbProviderId),
  );

  if (flatrate.some((provider) => selectedIds.has(provider.tmdbProviderId))) {
    return true;
  }

  return rent.some((provider) => rentMatchesService(provider, selectedServices));
}

export function filterByViewerServices<T extends {
  providers: Provider[];
  rentProviders?: Provider[];
  onList?: boolean;
}>(
  movies: T[],
  selectedServiceIds: number[],
  services: Provider[],
): T[] {
  if (selectedServiceIds.length === 0) return movies;

  const selectedServices = services.filter((provider) =>
    selectedServiceIds.includes(provider.tmdbProviderId),
  );
  if (selectedServices.length === 0) return movies;

  return movies.filter((movie) => {
    if (movie.onList) return true;
    const rent = movie.rentProviders ?? [];
    return matchesSelectedServices(movie.providers, rent, selectedServices);
  });
}
