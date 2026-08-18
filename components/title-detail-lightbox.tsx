"use client";

import { useEffect, useState } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import type { MediaType } from "@/lib/media";
import { fetchNoStore } from "@/lib/http-cache";
import { formatReleaseLabel } from "@/lib/release-label";
import type { TitleDetails } from "@/lib/tmdb";
import { tmdbImageUrl } from "@/lib/tmdb";
import { TrashIcon } from "./icons";
import { ProviderBadges } from "./provider-badges";

export function TitleDetailLightbox({
  tmdbMovieId,
  mediaType,
  title,
  year,
  posterPath,
  overview,
  availability,
  onRemove,
  onClose,
}: {
  tmdbMovieId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview?: string;
  availability: ViewerAvailability;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<TitleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchNoStore(
      `/api/movies/${tmdbMovieId}/details?mediaType=${mediaType}`,
    )
      .then(async (response) => {
        const data = (await response.json()) as {
          details?: TitleDetails;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Could not load details");
          setDetails(null);
          return;
        }
        setDetails(data.details ?? null);
        const firstTrailer = data.details?.trailers[0]?.key ?? null;
        setActiveTrailerKey(firstTrailer);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaType, tmdbMovieId]);

  const displayTitle = details?.title ?? title;
  const displayYear = details?.year ?? year;
  const displayOverview = details?.overview || overview || "";
  const displayPoster = details?.posterPath ?? posterPath;
  const posterSrc = tmdbImageUrl(displayPoster, "w500");
  const trailers = details?.trailers ?? [];
  const tvStats = details?.tvStats ?? null;

  return (
    <div
      className="title-lightbox-overlay fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={displayTitle}
        className="title-lightbox-panel relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl md:max-h-[min(92vh,920px)] md:flex-row md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="title-lightbox-close absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none"
        >
          ×
        </button>

        <div className="title-lightbox-mobile-header flex gap-3 border-b border-white/10 p-4 md:hidden">
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterSrc}
              alt=""
              className="h-24 w-16 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 p-2 text-center text-xs text-muted">
              {displayTitle}
            </div>
          )}
          <div className="min-w-0 pr-8">
            <p className="text-xs uppercase tracking-wide text-muted">
              {mediaType === "tv" ? "Series" : "Movie"}
              {details?.contentRating ? ` · ${details.contentRating}` : ""}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">
              {displayTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatReleaseLabel(displayYear)}
            </p>
          </div>
        </div>

        <div className="title-lightbox-poster hidden shrink-0 md:block md:w-[min(38%,320px)]">
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterSrc}
              alt=""
              className="h-full w-full object-cover md:min-h-[28rem]"
            />
          ) : (
            <div className="flex min-h-[16rem] items-center justify-center p-6 text-center text-sm text-muted md:min-h-[28rem]">
              {displayTitle}
            </div>
          )}
        </div>

        <div className="title-lightbox-body flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          <div className="hidden md:block">
            <p className="text-xs uppercase tracking-wide text-muted">
              {mediaType === "tv" ? "Series" : "Movie"}
              {details?.contentRating ? ` · ${details.contentRating}` : ""}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight md:text-3xl">
              {displayTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatReleaseLabel(displayYear)}
            </p>
          </div>

          {tvStats ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium">
                {tvStats.seasonCount} season{tvStats.seasonCount === 1 ? "" : "s"}
                {" · "}
                {tvStats.episodeCount} episode
                {tvStats.episodeCount === 1 ? "" : "s"}
              </p>
              {tvStats.seasons.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm text-muted">
                  {tvStats.seasons.map((season) => (
                    <li key={season.seasonNumber}>
                      {season.name} — {season.episodeCount} episode
                      {season.episodeCount === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-medium text-foreground">Overview</h3>
            {loading && !displayOverview ? (
              <p className="mt-2 text-sm text-muted">Loading…</p>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {displayOverview || "No description available."}
              </p>
            )}
            {error ? <p className="mt-2 text-sm text-amber-200">{error}</p> : null}
          </div>

          {trailers.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium">Trailers</h3>
              {activeTrailerKey ? (
                <div className="mt-3 aspect-video overflow-hidden rounded-2xl bg-black">
                  <iframe
                    title={`${displayTitle} trailer`}
                    src={`https://www.youtube.com/embed/${activeTrailerKey}?rel=0`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null}
              {trailers.length > 1 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {trailers.map((trailer) => (
                    <li key={trailer.key}>
                      <button
                        type="button"
                        onClick={() => setActiveTrailerKey(trailer.key)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          activeTrailerKey === trailer.key
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-white/15 text-muted hover:border-white/30 hover:text-foreground"
                        }`}
                      >
                        {trailer.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : loading ? (
            <p className="text-sm text-muted">Loading trailers…</p>
          ) : null}

          <div>
            <h3 className="text-sm font-medium">Where to watch</h3>
            <div className="mt-2">
              <ProviderBadges
                availability={availability}
                title={displayTitle}
                linkable
              />
            </div>
          </div>

          {onRemove ? (
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
                className="title-lightbox-remove flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm font-medium text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-950/50"
              >
                <TrashIcon className="h-4 w-4" />
                Remove from list
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
