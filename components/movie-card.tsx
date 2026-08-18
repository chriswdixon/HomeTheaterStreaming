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

  const hasIconActions = Boolean(
    onWatched || onRemove || onUnwatch || onCopyToShared,
  );
  const hasActions = hasIconActions || Boolean(actions);

  const actionOverlay = hasActions ? (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center gap-2 rounded-2xl bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 group-hover/card:pointer-events-auto group-focus-within/card:pointer-events-auto">
      {hasIconActions ? (
        <div className="pointer-events-auto flex w-full items-center gap-2">
          {onUnwatch ? (
            <IconButton label="Mark not watched" onClick={onUnwatch} tone="watched">
              <CheckIcon className="h-4 w-4" />
            </IconButton>
          ) : onWatched ? (
            <IconButton label="Watched" onClick={onWatched} tone="watched">
              <CheckIcon className="h-4 w-4" />
            </IconButton>
          ) : null}
          {onCopyToShared ? (
            <IconButton label="Copy to shared list" onClick={onCopyToShared} tone="add">
              <CopyIcon className="h-4 w-4" />
            </IconButton>
          ) : null}
          {onRemove ? (
            <IconButton
              label="Remove"
              onClick={onRemove}
              tone="delete"
              className="ml-auto"
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          ) : null}
        </div>
      ) : (
        <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  ) : null;

  const posterBlock = (
    <div className="relative">
      <MoviePoster title={title} posterPath={posterPath} />
      {order != null ? (
        <span className="glass-badge absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center font-semibold text-foreground">
          {order}
        </span>
      ) : null}
      {mediaType === "tv" ? (
        <span
          className={`glass-badge absolute z-20 uppercase tracking-wide ${
            order != null ? "right-2 top-2" : "left-2 top-2"
          }`}
        >
          Series
        </span>
      ) : null}
      {draggable ? (
        <span className="glass-badge absolute right-2 top-2 z-20 p-1 text-muted">
          <GripIcon className="h-4 w-4" />
        </span>
      ) : null}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="absolute inset-0 z-0 rounded-2xl"
        />
      ) : null}
      {actionOverlay}
    </div>
  );

  const detailsBlock = (
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
  );

  return (
    <article
      className={`group/card glass flex h-full flex-col rounded-3xl p-3 transition-shadow hover:ring-2 hover:ring-[var(--accent-warm)] ${
        onOpen ? "hover:-translate-y-0.5" : ""
      }`}
    >
      {posterBlock}
      {detailsBlock}
    </article>
  );
}

function IconButton({
  label,
  onClick,
  children,
  tone = "watched",
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "add" | "watched" | "delete";
  className?: string;
}) {
  const toneClass =
    tone === "add"
      ? "action-btn-add"
      : tone === "delete"
        ? "action-btn-delete"
        : "action-btn-watched";

  return (
    <div className={`group/action relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`pointer-events-auto glass-icon-button ${toneClass}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`app-tooltip pointer-events-none absolute bottom-[calc(100%+0.4rem)] z-20 whitespace-nowrap opacity-0 transition-opacity group-hover/action:opacity-100 group-focus-visible/action:opacity-100 ${
          tone === "delete" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
