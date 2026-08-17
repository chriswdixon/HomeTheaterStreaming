import type { Provider } from "./effective-services";

const FEATURED_NAMES = new Set(
  [
    "Netflix",
    "Disney Plus",
    "Disney+",
    "Amazon Prime Video",
    "Prime Video",
    "Max",
    "HBO Max",
    "Hulu",
    "Apple TV",
    "Apple TV Plus",
    "Apple TV+",
    "Paramount Plus",
    "Paramount+",
    "Peacock",
    "Peacock Premium",
    "Starz",
    "MGM+",
    "Discovery+",
  ].map((name) => name.toLowerCase()),
);

export function partitionProviders(providers: Provider[]) {
  const featured: Provider[] = [];
  const rest: Provider[] = [];

  for (const provider of providers) {
    if (FEATURED_NAMES.has(provider.name.toLowerCase())) {
      featured.push(provider);
    } else {
      rest.push(provider);
    }
  }

  featured.sort((a, b) => a.name.localeCompare(b.name));
  rest.sort((a, b) => a.name.localeCompare(b.name));
  return { featured, rest };
}
