import type { Provider } from "@/lib/effective-services";
import { tmdbImageUrl } from "@/lib/tmdb";

export function ProviderBadges({
  providers,
  emptyLabel = "Not on your services",
}: {
  providers: Provider[];
  emptyLabel?: string;
}) {
  if (providers.length === 0) {
    return <p className="text-xs text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {providers.map((provider) => {
        const logo = tmdbImageUrl(provider.logoPath, "w92");
        return (
          <li
            key={provider.tmdbProviderId}
            title={provider.name}
            className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[11px]"
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-4 w-4 rounded-sm object-cover" />
            ) : null}
            <span>{provider.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
