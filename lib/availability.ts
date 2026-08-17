import type { Provider } from "./effective-services";

export function availabilityForViewer(
  cachedFlatrate: Provider[],
  effectiveProviderIds: Set<number>,
): { available: boolean; onServices: Provider[] } {
  const onServices = cachedFlatrate.filter((provider) =>
    effectiveProviderIds.has(provider.tmdbProviderId),
  );
  return {
    available: onServices.length > 0,
    onServices,
  };
}
