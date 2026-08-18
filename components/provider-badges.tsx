import type { ReactNode } from "react";
import type { Provider } from "@/lib/effective-services";
import type { ViewerAvailability } from "@/lib/availability";
import { streamingOpenTarget } from "@/lib/streaming-links";
import { tmdbImageUrl } from "@/lib/tmdb";

export function ProviderBadges({
  availability,
  title,
  linkable = false,
}: {
  availability: ViewerAvailability;
  title?: string;
  linkable?: boolean;
}) {
  if (availability.available && availability.onServices.length > 0) {
    return (
      <ul className="flex w-full flex-wrap items-end gap-1.5">
        {availability.onServices.map((provider) => (
          <ProviderChip
            key={provider.tmdbProviderId}
            provider={provider}
            href={
              linkable && title
                ? streamingOpenTarget({
                    provider,
                    title,
                    watchUrl: availability.openTarget?.webUrl ?? null,
                  })?.webUrl
                : undefined
            }
          />
        ))}
      </ul>
    );
  }

  if (availability.onRentServices.length > 0) {
    return (
      <ul className="flex w-full flex-wrap items-end gap-1.5">
        {availability.onRentServices.map((provider) => (
          <ProviderChip
            key={provider.tmdbProviderId}
            provider={provider}
            label={`Rent on ${provider.name}`}
            href={
              linkable && title
                ? streamingOpenTarget({
                    provider,
                    title,
                    watchUrl: availability.openTarget?.webUrl ?? null,
                  })?.webUrl
                : undefined
            }
          />
        ))}
      </ul>
    );
  }

  if (availability.openTarget) {
    const label = `View on ${availability.openTarget.provider.name}`;
    return (
      <a
        href={availability.openTarget.webUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full text-xs text-accent underline-offset-2 hover:underline"
      >
        <ProviderChip
          provider={availability.openTarget.provider}
          label={label}
        />
      </a>
    );
  }

  return (
    <p className="w-full text-xs leading-snug text-muted">
      No stream or rental found
    </p>
  );
}

function ProviderChip({
  provider,
  label,
  href,
}: {
  provider: Provider;
  label?: string;
  href?: string;
}) {
  const logo = tmdbImageUrl(provider.logoPath, "w92");
  const content = (
    <>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-4 w-4 rounded-sm object-cover" />
      ) : null}
      <span>{label ?? provider.name}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={label ?? provider.name}
        onClick={(event) => event.stopPropagation()}
        className="flex items-center gap-1 glass-badge px-2 py-1 text-[11px] no-underline transition-colors hover:border-accent/40 hover:text-accent"
      >
        {content}
      </a>
    );
  }

  return (
    <span
      title={label ?? provider.name}
      className="flex items-center gap-1 glass-badge px-2 py-1 text-[11px]"
    >
      {content}
    </span>
  );
}
