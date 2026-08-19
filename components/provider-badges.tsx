import type { Provider } from "@/lib/effective-services";
import type { ViewerAvailability } from "@/lib/availability";
import { dedupeProvidersByFamily } from "@/lib/availability";
import { streamingOpenTarget } from "@/lib/streaming-links";
import { tmdbImageUrl } from "@/lib/tmdb";

export function ProviderBadges({
  availability,
  title,
  linkable = false,
  logoOnly = false,
}: {
  availability: ViewerAvailability;
  title?: string;
  linkable?: boolean;
  logoOnly?: boolean;
}) {
  const listClass = logoOnly
    ? "flex w-full flex-wrap items-center justify-end gap-1"
    : "flex w-full flex-wrap items-end gap-1.5";

  if (availability.available && availability.onServices.length > 0) {
    const providers = dedupeProvidersByFamily(availability.onServices);
    return (
      <ul className={listClass}>
        {providers.map((provider) => (
          <ProviderChip
            key={provider.tmdbProviderId}
            provider={provider}
            logoOnly={logoOnly}
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
    const providers = dedupeProvidersByFamily(availability.onRentServices);
    return (
      <ul className={listClass}>
        {providers.map((provider) => (
          <ProviderChip
            key={provider.tmdbProviderId}
            provider={provider}
            logoOnly={logoOnly}
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
      <div className={listClass}>
        <ProviderChip
          provider={availability.openTarget.provider}
          label={label}
          logoOnly={logoOnly}
          href={availability.openTarget.webUrl}
        />
      </div>
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
  logoOnly = false,
}: {
  provider: Provider;
  label?: string;
  href?: string;
  logoOnly?: boolean;
}) {
  const logo = tmdbImageUrl(provider.logoPath, "w92");
  const text = label ?? provider.name;
  const showText = !logoOnly || !logo;
  const content = (
    <>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className={
            logoOnly
              ? "h-6 w-6 rounded-md object-cover"
              : "h-4 w-4 rounded-sm object-cover"
          }
        />
      ) : null}
      {showText ? <span>{text}</span> : null}
    </>
  );
  const className = logoOnly
    ? href
      ? "inline-flex overflow-hidden rounded-md no-underline ring-1 ring-white/15 transition hover:ring-accent/60"
      : "inline-flex overflow-hidden rounded-md ring-1 ring-white/15"
    : href
      ? "flex items-center gap-1 glass-badge px-2 py-1 text-[11px] no-underline transition-colors hover:border-accent/40 hover:text-accent"
      : "flex items-center gap-1 glass-badge px-2 py-1 text-[11px]";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={text}
        aria-label={text}
        onClick={(event) => event.stopPropagation()}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <span title={text} aria-label={text} className={className}>
      {content}
    </span>
  );
}
