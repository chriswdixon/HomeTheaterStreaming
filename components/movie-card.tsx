"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import type { MediaType } from "@/lib/media";
import { formatReleaseLabel } from "@/lib/release-label";
import { tmdbImageUrl } from "@/lib/tmdb";
import {
  CardIconButton,
  ListStatusIcon,
  WatchNowIconLink,
} from "./card-action-buttons";
import { CheckIcon, GripIcon, SharedIcon, StarIcon, VoteIcon } from "./icons";
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
  onVote,
  voteCount,
  votedByCurrentUser,
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
  onVote?: () => void;
  voteCount?: number;
  votedByCurrentUser?: boolean;
  actions?: ReactNode;
  order?: number;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const openTarget = availability.openTarget;
  const cardIconActions = Boolean(
    onWatched || onUnwatch || onCopyToShared || onSharedList || onVote,
  );
  const showActions = Boolean(openTarget || cardIconActions || actions);
  const canOpenDetail = tmdbMovieId != null;

  function stopOverlayClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function handlePosterClick() {
    if (canOpenDetail) setDetailOpen(true);
  }

  const watchNowButton = openTarget ? (
    <WatchNowIconLink href={openTarget.webUrl} onClick={stopOverlayClick} />
  ) : null;

  const actionButtons = showActions ? (
    <>
      {watchNowButton}
      {cardIconActions ? (
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
          {onVote ? (
            <CardIconButton
              label={votedByCurrentUser ? "Remove vote" : "Vote for this title"}
              tone={votedByCurrentUser ? "shared" : "vote"}
              icon={<VoteIcon className="h-5 w-5" />}
              onClick={(event) => {
                stopOverlayClick(event);
                onVote();
              }}
            />
          ) : null}
        </>
      ) : (
        <div className="card-action-stack flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </>
  ) : null;

  const posterBlock = (
    <div className="movie-card-poster relative overflow-visible">
      <button
        type="button"
        onClick={handlePosterClick}
        disabled={!canOpenDetail}
        className={`block w-full text-left ${canOpenDetail ? "cursor-pointer" : "cursor-default"}`}
        aria-label={canOpenDetail ? `View details for ${title}` : undefined}
      >
        <MoviePoster title={title} posterPath={posterPath} />
      </button>
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
      {showActions ? (
        <>
          <div className="card-action-overlay card-action-overlay-desktop pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl p-4 opacity-0 transition-opacity">
            <div className="card-action-stack pointer-events-auto flex flex-col items-center gap-2">
              {actionButtons}
            </div>
          </div>
          <div
            className="card-action-mobile-bar"
            onClick={stopOverlayClick}
            role="presentation"
          >
            {actionButtons}
          </div>
        </>
      ) : null}
    </div>
  );

  const detailsBlock = (
    <div className="movie-card-meta mt-3 flex min-h-0 flex-1 flex-col gap-2">
      <div className="movie-card-title-block min-h-[3.2rem]">
        <h3 className="line-clamp-2 font-medium leading-snug">{title}</h3>
        <p className="text-xs text-muted">{formatReleaseLabel(year)}</p>
      </div>
      <p className="movie-card-overview line-clamp-2 min-h-[2.4rem] text-xs text-muted">
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
        className="mt-auto flex min-h-[1.75rem] w-full items-end justify-between gap-2"
        onClick={stopOverlayClick}
      >
        {voteCount != null ? (
          <span
            className={`vote-count-badge ${votedByCurrentUser ? "vote-count-badge-active" : ""}`}
            title={`${voteCount} vote${voteCount === 1 ? "" : "s"}`}
          >
            <VoteIcon className="h-3.5 w-3.5" />
            <span>{voteCount}</span>
          </span>
        ) : (
          <span />
        )}
        <ProviderBadges availability={availability} title={title} linkable />
      </div>
    </div>
  );

  return (
    <>
      <article className="group/card movie-card glass flex h-full flex-col rounded-3xl p-3 transition-shadow hover:ring-2 hover:ring-[var(--accent-warm)]">
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
          onRemove={onRemove}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}
