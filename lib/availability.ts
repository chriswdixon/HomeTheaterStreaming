import type { Provider } from "./effective-services";

export type CachedWatchOptions = {
  flatrate: Provider[];
  rent: Provider[];
  watchUrl: string | null;
};

export type RentOffer = {
  provider: Provider;
  watchUrl: string | null;
};

export type ViewerAvailability = {
  available: boolean;
  onServices: Provider[];
  rentOffer: RentOffer | null;
};

export function providerFamily(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("prime") || n.includes("amazon")) return "amazon";
  if (n.includes("apple")) return "apple";
  if (n.includes("google play") || n.includes("youtube")) return "google";
  if (n.includes("microsoft")) return "microsoft";
  if (n.includes("vudu") || n.includes("fandango")) return "fandango";
  return n;
}

function rentMatchesService(rentProvider: Provider, services: Provider[]): boolean {
  const family = providerFamily(rentProvider.name);
  return services.some(
    (service) =>
      service.tmdbProviderId === rentProvider.tmdbProviderId ||
      providerFamily(service.name) === family,
  );
}

export function availabilityForViewer(
  cached: CachedWatchOptions,
  services: Provider[],
): ViewerAvailability {
  const serviceIds = new Set(services.map((provider) => provider.tmdbProviderId));
  const onServices = cached.flatrate.filter((provider) =>
    serviceIds.has(provider.tmdbProviderId),
  );

  if (onServices.length > 0) {
    return { available: true, onServices, rentOffer: null };
  }

  const matchingRent = cached.rent.find((provider) =>
    rentMatchesService(provider, services),
  );
  const rentProvider = matchingRent ?? cached.rent[0] ?? null;

  return {
    available: false,
    onServices: [],
    rentOffer: rentProvider
      ? { provider: rentProvider, watchUrl: cached.watchUrl }
      : null,
  };
}
