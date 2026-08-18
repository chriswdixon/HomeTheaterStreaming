import type { Provider } from "./effective-services";

export type StreamingOpenTarget = {
  provider: Provider;
  appUrl: string;
  webUrl: string;
};

type LinkBuilder = {
  appUrl: (query: string) => string;
  webUrl: (query: string) => string;
};

const encoded = (query: string) => encodeURIComponent(query);

const LINKS_BY_PROVIDER_ID: Record<number, LinkBuilder> = {
  8: {
    appUrl: (query) => `nflx://www.netflix.com/search?q=${encoded(query)}`,
    webUrl: (query) => `https://www.netflix.com/search?q=${encoded(query)}`,
  },
  9: {
    appUrl: (query) =>
      `aiv://aiv/search?q=${encoded(query)}`,
    webUrl: (query) =>
      `https://www.amazon.com/s?k=${encoded(query)}&i=instant-video`,
  },
  10: {
    appUrl: (query) =>
      `aiv://aiv/search?q=${encoded(query)}`,
    webUrl: (query) =>
      `https://www.amazon.com/s?k=${encoded(query)}&i=instant-video`,
  },
  15: {
    appUrl: (query) => `hulu://search?q=${encoded(query)}`,
    webUrl: (query) => `https://www.hulu.com/search?q=${encoded(query)}`,
  },
  337: {
    appUrl: (query) =>
      `disneyplus://search?query=${encoded(query)}`,
    webUrl: (query) =>
      `https://www.disneyplus.com/search?q=${encoded(query)}`,
  },
  350: {
    appUrl: (query) => `videos://search?term=${encoded(query)}`,
    webUrl: (query) => `https://tv.apple.com/search?term=${encoded(query)}`,
  },
  2: {
    appUrl: (query) => `videos://search?term=${encoded(query)}`,
    webUrl: (query) => `https://tv.apple.com/search?term=${encoded(query)}`,
  },
  386: {
    appUrl: (query) => `peacocktv://search?q=${encoded(query)}`,
    webUrl: (query) => `https://www.peacocktv.com/search?q=${encoded(query)}`,
  },
  531: {
    appUrl: (query) =>
      `paramountplus://search?q=${encoded(query)}`,
    webUrl: (query) =>
      `https://www.paramountplus.com/search/?q=${encoded(query)}`,
  },
  1899: {
    appUrl: (query) => `max://search?q=${encoded(query)}`,
    webUrl: (query) => `https://play.max.com/search?q=${encoded(query)}`,
  },
};

const LINKS_BY_FAMILY: Record<string, LinkBuilder> = {
  amazon: LINKS_BY_PROVIDER_ID[9]!,
  apple: LINKS_BY_PROVIDER_ID[350]!,
};

function providerFamily(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("prime") || n.includes("amazon")) return "amazon";
  if (n.includes("apple")) return "apple";
  return n;
}

function linkBuilderFor(provider: Provider): LinkBuilder | null {
  return (
    LINKS_BY_PROVIDER_ID[provider.tmdbProviderId] ??
    LINKS_BY_FAMILY[providerFamily(provider.name)] ??
    null
  );
}

export function streamingOpenTarget(input: {
  provider: Provider;
  title: string;
  watchUrl: string | null;
}): StreamingOpenTarget | null {
  const builder = linkBuilderFor(input.provider);
  if (builder) {
    return {
      provider: input.provider,
      appUrl: builder.appUrl(input.title),
      webUrl: builder.webUrl(input.title),
    };
  }

  if (input.watchUrl) {
    return {
      provider: input.provider,
      appUrl: input.watchUrl,
      webUrl: input.watchUrl,
    };
  }

  return null;
}
