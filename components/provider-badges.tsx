import type { Provider } from "@/lib/effective-services";
import type { ViewerAvailability } from "@/lib/availability";
import { tmdbImageUrl } from "@/lib/tmdb";

export function ProviderBadges({
  availability,
}: {
  availability: ViewerAvailability;
}) {
  if (availability.available && availability.onServices.length > 0) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {availability.onServices.map((provider) => (
          <ProviderChip key={provider.tmdbProviderId} provider={provider} />
        ))}
      </ul>
    );
  }

  if (availability.rentOffer) {
    const { provider, watchUrl } = availability.rentOffer;
    const label = `Rent on ${provider.name}`;
    const chip = <ProviderChip provider={provider} label={label} />;

    if (!watchUrl) {
      return <p className="text-xs text-muted">{label}</p>;
    }

    return (
      <a
        href={watchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-xs text-accent underline-offset-2 hover:underline"
      >
        {chip}
      </a>
    );
  }

  return <p className="text-xs text-muted">No stream or rental found</p>;
}

function ProviderChip({
  provider,
  label,
}: {
  provider: Provider;
  label?: string;
}) {
  const logo = tmdbImageUrl(provider.logoPath, "w92");
  return (
    <span
      title={label ?? provider.name}
      className="flex items-center gap-1 glass-badge px-2 py-1 text-[11px]"
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-4 w-4 rounded-sm object-cover" />
      ) : null}
      <span>{label ?? provider.name}</span>
    </span>
  );
}
