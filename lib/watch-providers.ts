import type { Provider } from "./effective-services";

export function mergeRentalProviders(rent: Provider[], buy: Provider[]): Provider[] {
  const seen = new Set<number>();
  const merged: Provider[] = [];

  for (const provider of [...rent, ...buy]) {
    if (seen.has(provider.tmdbProviderId)) continue;
    seen.add(provider.tmdbProviderId);
    merged.push(provider);
  }

  return merged;
}

export function needsWatchProviderBackfill(row: {
  cachedRentProviders?: Provider[] | null;
  watchUrl?: string | null;
}): boolean {
  return (row.cachedRentProviders ?? []).length === 0 || row.watchUrl == null;
}
