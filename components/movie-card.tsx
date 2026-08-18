import type { ReactNode } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import type { MediaType } from "@/lib/media";
import { tmdbImageUrl } from "@/lib/tmdb";
import { CheckIcon, CopyIcon, GripIcon, StarIcon, TrashIcon } from "./icons";
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
      <div className="flex aspect-[2/3] items-center justify-center rounded-2xl glass-subtle text-center text-xs text-muted">
        {title}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className="aspect-[2/3] w-full rounded-2xl object-cover shadow-lg"
    />
  );
}

export function MovieCard({
  title,
  year,
  posterPath,
  overview,
  availability,
  mediaType,
  rating,
  draggable,
  onWatched,
  onRemove,
  onUnwatch,
  onCopyToShared,
  actions,
  order,
  onOpen,
}: {
  title: string;
  year: string | null;
  posterPath: string | null;
  overview?: string;
  availability: ViewerAvailability;
  mediaType?: MediaType;
  rating?: number | null;
  draggable?: boolean;
  onWatched?: () => void;
  onRemove?: () => void;
  onUnwatch?: () => void;
  onCopyToShared?: () => void;
  actions?: ReactNode;
  order?: number;
  onOpen?: () => void;
}) {
  const openLabel = availability.openTarget
    ? `Open on ${availability.openTarget.provider.name}`
    : undefined;

  const mainContent = (
    <>
      <div className="relative">
        <MoviePoster title={title} posterPath={posterPath} />
        {order != null ? (
          <span className="glass-badge absolute left-2 top-2 flex h-7 w-7 items-center justify-center font-semibold text-foreground">
            {order}
          </span>
        ) : null}
        {mediaType === "tv" ? (
          <span
            className={`glass-badge absolute uppercase tracking-wide ${
              order != null ? "right-2 top-2" : "left-2 top-2"
            }`}
          >
            Series
          </span>
        ) : null}
        {draggable ? (
          <span className="glass-badge absolute right-2 top-2 p-1 text-muted">
            <GripIcon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex min-h-0 flex-col gap-2">
        <div className="min-h-[3.2rem]">
          <h3 className="line-clamp-2 font-medium leading-snug">{title}</h3>
          {year ? <p className="text-xs text-muted">{year}</p> : null}
        </div>
        <p className="line-clamp-2 min-h-[2.4rem] text-xs text-muted">
          {overview || " "}
        </p>
        {rating ? (
          <p className="flex items-center gap-0.5 text-accent">
            {Array.from({ length: 5 }, (_, index) => (
              <StarIcon
                key={index}
                className="h-3.5 w-3.5"
                filled={index < rating}
              />
            ))}
          </p>
        ) : null}
        <ProviderBadges availability={availability} />
      </div>
    </>
  );

  return (
    <article
      className={`group glass flex h-full flex-col rounded-3xl p-3 transition-shadow hover:ring-2 hover:ring-[var(--accent-warm)] ${
        onOpen ? "hover:-translate-y-0.5" : ""
      }`}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="block w-full flex-1 cursor-pointer text-left"
        >
          {mainContent}
        </button>
      ) : (
        <div className="flex-1">{mainContent}</div>
      )}
      {onWatched || onRemove || onUnwatch || onCopyToShared ? (
        <div className="mt-auto flex items-center gap-2 pt-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {onUnwatch ? (
            <IconButton label="Mark not watched" onClick={onUnwatch}>
              <CheckIcon className="h-4 w-4" />
            </IconButton>
          ) : onWatched ? (
            <IconButton label="Watched" onClick={onWatched}>
              <CheckIcon className="h-4 w-4" />
            </IconButton>
          ) : null}
          {onCopyToShared ? (
            <IconButton label="Copy to shared list" onClick={onCopyToShared}>
              <CopyIcon className="h-4 w-4" />
            </IconButton>
          ) : null}
          {onRemove ? (
            <IconButton
              label="Remove"
              onClick={onRemove}
              tone="danger"
              className="ml-auto"
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          ) : null}
        </div>
      ) : actions ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

function IconButton({
  label,
  onClick,
  children,
  tone = "accent",
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "accent" | "danger";
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`glass-icon-button ${tone === "danger" ? "hover:!border-red-400/50 hover:!text-red-300" : ""}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`app-tooltip pointer-events-none absolute bottom-[calc(100%+0.4rem)] z-10 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 ${
          tone === "danger" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
