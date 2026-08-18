"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import type { MediaType } from "@/lib/media";
import { formatReleaseLabel } from "@/lib/release-label";
import type { StreamingOpenTarget } from "@/lib/streaming-links";
import { tmdbImageUrl } from "@/lib/tmdb";
import {
  CardIconButton,
  ListStatusIcon,
  WatchNowIconLink,
} from "./card-action-buttons";
import { CheckIcon, GripIcon, SharedIcon, StarIcon, TrashIcon } from "./icons";
import { ProviderBadges } from "./provider-badges";
import { TitleDetailLightbox } from "./title-detail-lightbox";

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
  tmdbMovieId,
  title,
  year,
  posterPath,
  overview,
  availability,
  mediaType = "movie",
  rating,
  draggable,
  onWatched,
  onRemove,
  onUnwatch,
  onCopyToShared,
  onSharedList,
  actions,
  order,
}: {
  tmdbMovieId?: number;
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
  onSharedList?: boolean;
  actions?: ReactNode;
  order?: number;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const openTarget = availability.openTarget;
  const hasIconActions = Boolean(
    onWatched || onRemove || onUnwatch || onCopyToShared || onSharedList,
  );
  const showOverlay = Boolean(openTarget || hasIconActions || actions);
  const canOpenDetail = tmdbMovieId != null;

  function stopOverlayClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function handleCardClick() {
    if (canOpenDetail) setDetailOpen(true);
  }

  const watchNowButton = openTarget ? (
    <WatchNowIconLink
      href={openTarget.webUrl}
      onClick={stopOverlayClick}
    />
  ) : null;

  const actionOverlay = showOverlay ? (
    <div className="card-action-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl p-4 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 group-hover/card:pointer-events-auto group-focus-within/card:pointer-events-auto">
      <div className="card-action-stack pointer-events-auto flex flex-col items-center gap-2">
        {watchNowButton}
        {hasIconActions ? (
          <>
            {onUnwatch ? (
              <CardIconButton
                label="Mark not watched"
                tone="watched"
                icon={<CheckIcon className="h-5 w-5" />}
                onClick={(event) => {
                  stopOverlayClick(event);
                  onUnwatch();
                }}
              />
            ) : onWatched ? (
              <CardIconButton
                label="Mark watched"
                tone="watched"
                icon={<CheckIcon className="h-5 w-5" />}
                onClick={(event) => {
                  stopOverlayClick(event);
                  onWatched();
                }}
              />
            ) : null}
            {onCopyToShared ? (
              onSharedList ? (
                <ListStatusIcon label="On shared list" />
              ) : (
                <CardIconButton
                  label="Add to shared list"
                  tone="shared"
                  icon={<SharedIcon className="h-5 w-5" />}
                  onClick={(event) => {
                    stopOverlayClick(event);
                    onCopyToShared();
                  }}
                />
              )
            ) : null}
            {onRemove ? (
              <CardIconButton
                label="Remove"
                tone="delete"
                icon={<TrashIcon className="h-5 w-5" />}
                onClick={(event) => {
                  stopOverlayClick(event);
                  onRemove();
                }}
              />
            ) : null}
          </>
        ) : (
          <div
            className="card-action-stack flex flex-col items-center gap-2"
            onClick={stopOverlayClick}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const posterBlock = (
    <div className="relative overflow-visible">
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
      {actionOverlay}
    </div>
  );

  const detailsBlock = (
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
      <div className="min-h-[3.2rem]">
        <h3 className="line-clamp-2 font-medium leading-snug">{title}</h3>
        <p className="text-xs text-muted">{formatReleaseLabel(year)}</p>
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
      <div
        className="mt-auto flex min-h-[1.75rem] w-full items-end"
        onClick={stopOverlayClick}
      >
        <ProviderBadges availability={availability} title={title} linkable />
      </div>
    </div>
  );

  return (
    <>
      <article
        className={`group/card glass flex h-full flex-col rounded-3xl p-3 transition-shadow hover:ring-2 hover:ring-[var(--accent-warm)] ${
          canOpenDetail ? "cursor-pointer" : ""
        }`}
        onClick={canOpenDetail ? handleCardClick : undefined}
        onKeyDown={
          canOpenDetail
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setDetailOpen(true);
                }
              }
            : undefined
        }
        tabIndex={canOpenDetail ? 0 : undefined}
        aria-label={canOpenDetail ? `View details for ${title}` : undefined}
      >
        {posterBlock}
        {detailsBlock}
      </article>
      {detailOpen && tmdbMovieId != null ? (
        <TitleDetailLightbox
          tmdbMovieId={tmdbMovieId}
          mediaType={mediaType}
          title={title}
          year={year}
          posterPath={posterPath}
          overview={overview}
          availability={availability}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}
