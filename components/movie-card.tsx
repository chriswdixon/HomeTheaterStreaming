import type { ReactNode } from "react";
import type { Provider } from "@/lib/effective-services";
import { tmdbImageUrl } from "@/lib/tmdb";
import { ProviderBadges } from "./provider-badges";

export function MoviePoster({
  title,
  posterPath,
}: {
  title: string;
  posterPath: string | null;
}) {
  const src = tmdbImageUrl(posterPath, "w342");
  if (!src) {
    return (
      <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-white/5 text-center text-xs text-muted">
        {title}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className="aspect-[2/3] w-full rounded-xl object-cover"
    />
  );
}

export function MovieCard({
  title,
  year,
  posterPath,
  overview,
  providers,
  actions,
}: {
  title: string;
  year: string | null;
  posterPath: string | null;
  overview?: string;
  providers: Provider[];
  actions?: ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-card/80 p-3">
      <MoviePoster title={title} posterPath={posterPath} />
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <div>
          <h3 className="font-medium leading-snug">{title}</h3>
          {year ? <p className="text-xs text-muted">{year}</p> : null}
        </div>
        {overview ? (
          <p className="line-clamp-3 text-xs text-muted">{overview}</p>
        ) : null}
        <ProviderBadges providers={providers} />
        {actions ? <div className="mt-auto flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}
