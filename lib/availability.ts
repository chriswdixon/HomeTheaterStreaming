import type { Provider } from "./effective-services";
import type { MediaType } from "./media";
import { streamingOpenTarget, type StreamingOpenTarget } from "./streaming-links";

export type { StreamingOpenTarget };

export type CachedWatchOptions = {
  flatrate: Provider[];
  rent: Provider[];
  watchUrl: string | null;
};

export type TitleContext = {
  title: string;
  tmdbMovieId: number;
  mediaType: MediaType;
};

export type RentOffer = {
  provider: Provider;
  watchUrl: string | null;
};

export type ViewerAvailability = {
  available: boolean;
  onServices: Provider[];
  rentOffer: RentOffer | null;
  openTarget: StreamingOpenTarget | null;
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
  title?: TitleContext,
): ViewerAvailability {
  const serviceIds = new Set(services.map((provider) => provider.tmdbProviderId));
  const onServices = cached.flatrate.filter((provider) =>
    serviceIds.has(provider.tmdbProviderId),
  );

  if (onServices.length > 0) {
    const provider = onServices[0]!;
    return {
      available: true,
      onServices,
      rentOffer: null,
      openTarget: title
        ? streamingOpenTarget({
            provider,
            title: title.title,
            watchUrl: cached.watchUrl,
          })
        : null,
    };
  }

  const matchingRent = cached.rent.find((provider) =>
    rentMatchesService(provider, services),
  );
  const rentProvider = matchingRent ?? cached.rent[0] ?? null;

  const rentOffer = rentProvider
    ? { provider: rentProvider, watchUrl: cached.watchUrl }
    : null;

  let openTarget: StreamingOpenTarget | null = null;
  if (title && rentProvider) {
    const base = streamingOpenTarget({
      provider: rentProvider,
      title: title.title,
      watchUrl: cached.watchUrl,
    });
    openTarget =
      base && cached.watchUrl ? { ...base, webUrl: cached.watchUrl } : base;
  } else if (title && cached.watchUrl) {
    openTarget = streamingOpenTarget({
      provider: {
        tmdbProviderId: 0,
        name: "Watch options",
        logoPath: null,
      },
      title: title.title,
      watchUrl: cached.watchUrl,
    });
  }

  return {
    available: false,
    onServices: [],
    rentOffer,
    openTarget,
  };
}
