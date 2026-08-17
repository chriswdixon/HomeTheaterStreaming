export type Provider = {
  tmdbProviderId: number;
  name: string;
  logoPath: string | null;
};

export function mergeEffectiveServices(
  household: Provider[],
  personal: Provider[],
): Provider[] {
  const byId = new Map<number, Provider>();
  for (const provider of household) {
    byId.set(provider.tmdbProviderId, provider);
  }
  for (const provider of personal) {
    if (!byId.has(provider.tmdbProviderId)) {
      byId.set(provider.tmdbProviderId, provider);
    }
  }
  return [...byId.values()];
}
