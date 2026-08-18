"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Provider } from "@/lib/effective-services";
import { availabilityForViewer } from "@/lib/availability";
import { fetchNoStore } from "@/lib/http-cache";
import {
  filterByViewerServices,
} from "@/lib/recommendation-filter";
import type {
  AffinityGroup,
  RankedMovie,
  WatchOrderGroup,
} from "@/lib/recommendations";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import { MovieCard } from "./movie-card";
import { MultiSelectFilter } from "./multi-select-filter";

type UnlockedPayload = {
  unlocked: true;
  count: number;
  needed: number;
  watchOrderGroups?: WatchOrderGroup[];
  affinityGroups?: AffinityGroup[];
  generalRecs?: RankedMovie[];
  degraded?: boolean;
};

export function RecommendationsView({
  initial,
  viewerServices,
}: {
  initial:
    | { unlocked: false; count: number; needed: number; degraded?: boolean }
    | UnlockedPayload;
  viewerServices: Provider[];
}) {
  const router = useRouter();
  const [payload, setPayload] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  async function addFranchise(
    group: {
      name: string;
      movies: Array<{
        tmdbMovieId: number;
        mediaType?: TmdbSearchMovie["mediaType"];
        title: string;
        year: string | null;
        posterPath: string | null;
        overview: string;
        order: number;
      }>;
    },
    list: "personal" | "shared",
  ) {
    setMessage(null);
    const response = await fetchNoStore("/api/watchlist/franchise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        list,
        folderName: group.name,
        movies: group.movies.map((movie) => ({
          tmdbMovieId: movie.tmdbMovieId,
          mediaType: movie.mediaType ?? "movie",
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          overview: movie.overview,
          order: movie.order,
        })),
      }),
    });
    const data = (await response.json()) as { error?: string; added?: number; updated?: number };
    if (!response.ok) {
      setMessage(data.error ?? "Could not add franchise");
      return;
    }

    const refresh = await fetchNoStore("/api/recommendations");
    const next = (await refresh.json()) as typeof payload;
    if (refresh.ok) setPayload(next);
    router.refresh();
    const listLabel = list === "personal" ? "your list" : "the shared list";
    setMessage(
      `Added ${group.name} to ${listLabel} (${data.added ?? 0} new, ${data.updated ?? 0} grouped)`,
    );
  }

  async function addMovie(
    movie: {
      tmdbMovieId: number;
      mediaType?: TmdbSearchMovie["mediaType"];
      title: string;
      year: string | null;
      posterPath: string | null;
      overview?: string;
    },
    list: "personal" | "shared",
  ) {
    setMessage(null);
    const response = await fetchNoStore("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        list,
        movie: {
          tmdbMovieId: movie.tmdbMovieId,
          mediaType: movie.mediaType ?? "movie",
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          overview: movie.overview ?? "",
        },
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not add movie");
      return;
    }

    const refresh = await fetchNoStore("/api/recommendations");
    const next = (await refresh.json()) as typeof payload;
    if (refresh.ok) setPayload(next);
    router.refresh();
    setMessage(`Added to ${list === "personal" ? "your list" : "the shared list"}`);
  }

  const unlocked = payload.unlocked;
  const watchOrderGroups = unlocked ? (payload.watchOrderGroups ?? []) : [];
  const affinityGroups = unlocked ? (payload.affinityGroups ?? []) : [];
  const generalRecs = unlocked ? (payload.generalRecs ?? []) : [];

  const filteredWatchOrderGroups = useMemo(
    () =>
      watchOrderGroups
        .map((group) => ({
          ...group,
          movies: filterByViewerServices(
            group.movies,
            selectedServiceIds,
            viewerServices,
          ),
        }))
        .filter((group) => group.movies.length > 0),
    [selectedServiceIds, viewerServices, watchOrderGroups],
  );

  const filteredAffinityGroups = useMemo(
    () =>
      affinityGroups
        .map((group) => ({
          ...group,
          movies: filterByViewerServices(
            group.movies,
            selectedServiceIds,
            viewerServices,
          ),
        }))
        .filter((group) => group.movies.length > 0),
    [affinityGroups, selectedServiceIds, viewerServices],
  );

  const filteredGeneralRecs = useMemo(
    () =>
      filterByViewerServices(generalRecs, selectedServiceIds, viewerServices),
    [generalRecs, selectedServiceIds, viewerServices],
  );

  if (!unlocked) {
    const remaining = payload.needed - payload.count;
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Recommendations</h1>
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Almost there</p>
          <h2 className="mt-3 text-2xl font-medium">
            Add {remaining} more {remaining === 1 ? "movie" : "movies"} to your list
          </h2>
          <p className="mt-2 text-muted">
            Recommendations unlock after {payload.needed} movies on your personal
            list ({payload.count}/{payload.needed}).
          </p>
          <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-accent"
              style={{ width: `${(payload.count / payload.needed) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const hasFranchiseRecs =
    filteredWatchOrderGroups.length > 0 || filteredAffinityGroups.length > 0;
  const hasRecommendations = hasFranchiseRecs || filteredGeneralRecs.length > 0;
  const hasUnfilteredRecommendations =
    watchOrderGroups.length > 0 ||
    affinityGroups.length > 0 ||
    generalRecs.length > 0;

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Recommendations</h1>
      <p className="mt-1 text-muted">
        Franchise paths from your list, plus similar titles you might enjoy.
      </p>
      {initial.degraded ? (
        <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Streaming availability data is sometimes rate-limited. Your lists are
          unchanged — refresh in a moment to reload recommendations.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-start gap-3">
        {viewerServices.length > 0 ? (
          <MultiSelectFilter
            label="Services"
            options={viewerServices.map((service) => ({
              value: service.tmdbProviderId,
              label: service.name,
            }))}
            selected={selectedServiceIds}
            onChange={setSelectedServiceIds}
          />
        ) : null}
      </div>
      {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      {!hasRecommendations ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">
            {hasUnfilteredRecommendations && selectedServiceIds.length > 0
              ? "Nothing on your selected services right now"
              : "No matches yet"}
          </h2>
          <p className="mt-2 text-muted">
            {hasUnfilteredRecommendations && selectedServiceIds.length > 0
              ? "Clear the service filter or pick different services to see more."
              : "Add more titles to your personal list to unlock franchise and general recommendations."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-14">
          {hasFranchiseRecs ? (
            <div className="space-y-12">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-accent">
                  Franchises & series
                </p>
                <h2 className="mt-1 text-2xl font-medium">
                  From collections on your list
                </h2>
              </div>
              {filteredWatchOrderGroups.map((group) => (
                <section key={group.name}>
                  <p className="text-xs uppercase tracking-[0.2em] text-accent">
                    {group.orderLabel === "first-watch"
                      ? "First-watch order"
                      : "Release order"}
                  </p>
                  <h3 className="mb-2 text-xl font-medium">{group.name}</h3>
                  <FranchiseAddButtons group={group} onAdd={addFranchise} />
                  <RecommendationGrid
                    movies={group.movies}
                    getKey={(movie) => `${group.name}-${movie.tmdbMovieId}`}
                    renderActions={(movie) =>
                      movie.onList ? (
                        <span className="glass-badge px-3 py-1 text-xs text-muted">
                          On your list
                        </span>
                      ) : (
                        <>
                          <AddButtons movie={movie} onAdd={addMovie} />
                        </>
                      )
                    }
                    getOrder={(movie) => movie.order}
                    viewerServices={viewerServices}
                  />
                </section>
              ))}
              {filteredAffinityGroups.map((group) => (
                <section key={group.name}>
                  <p className="text-xs uppercase tracking-[0.2em] text-accent">
                    Because you added 2+
                  </p>
                  <h3 className="mb-2 text-xl font-medium">{group.name}</h3>
                  <FranchiseAddButtons group={group} onAdd={addFranchise} />
                  <RecommendationGrid
                    movies={group.movies}
                    getKey={(movie) => `${group.name}-${movie.tmdbMovieId}`}
                    renderActions={(movie) => <AddButtons movie={movie} onAdd={addMovie} />}
                    viewerServices={viewerServices}
                  />
                </section>
              ))}
            </div>
          ) : null}
          {filteredGeneralRecs.length > 0 ? (
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                General recommendations
              </p>
              <h2 className="mt-1 mb-4 text-2xl font-medium">More you might like</h2>
              <p className="mb-4 text-sm text-muted">
                Similar titles based on your personal list, not grouped by streaming
                service.
              </p>
              <RecommendationGrid
                movies={filteredGeneralRecs}
                getKey={(movie) => `general-${movie.tmdbMovieId}`}
                renderActions={(movie) => <AddButtons movie={movie} onAdd={addMovie} />}
                viewerServices={viewerServices}
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FranchiseAddButtons({
  group,
  onAdd,
}: {
  group: {
    name: string;
    movies: Array<{
      tmdbMovieId: number;
      mediaType?: TmdbSearchMovie["mediaType"];
      title: string;
      year: string | null;
      posterPath: string | null;
      overview: string;
      order?: number;
    }>;
  };
  onAdd: (
    group: {
      name: string;
      movies: Array<{
        tmdbMovieId: number;
        mediaType?: TmdbSearchMovie["mediaType"];
        title: string;
        year: string | null;
        posterPath: string | null;
        overview: string;
        order: number;
      }>;
    },
    list: "personal" | "shared",
  ) => void;
}) {
  const payload = {
    name: group.name,
    movies: group.movies.map((movie, index) => ({
      tmdbMovieId: movie.tmdbMovieId,
      mediaType: movie.mediaType,
      title: movie.title,
      year: movie.year,
      posterPath: movie.posterPath,
      overview: movie.overview,
      order: movie.order ?? index + 1,
    })),
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onAdd(payload, "personal")}
        className="action-btn-pill action-btn-add px-3 py-1.5 text-xs"
      >
        Add franchise to My list
      </button>
      <button
        type="button"
        onClick={() => onAdd(payload, "shared")}
        className="action-btn-pill action-btn-add px-3 py-1.5 text-xs"
      >
        Add franchise to Shared
      </button>
    </div>
  );
}

function AddButtons({
  movie,
  onAdd,
}: {
  movie: {
    tmdbMovieId: number;
    mediaType?: TmdbSearchMovie["mediaType"];
    title: string;
    year: string | null;
    posterPath: string | null;
    overview: string;
  };
  onAdd: (
    movie: {
      tmdbMovieId: number;
      mediaType?: TmdbSearchMovie["mediaType"];
      title: string;
      year: string | null;
      posterPath: string | null;
      overview?: string;
    },
    list: "personal" | "shared",
  ) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onAdd(movie, "personal")}
        className="action-btn-pill action-btn-add px-3 py-1 text-xs"
      >
        My list
      </button>
      <button
        type="button"
        onClick={() => onAdd(movie, "shared")}
        className="action-btn-pill action-btn-add px-3 py-1 text-xs"
      >
        Shared
      </button>
    </>
  );
}

function RecommendationGrid<T extends {
  tmdbMovieId: number;
  mediaType?: TmdbSearchMovie["mediaType"];
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  providers: { tmdbProviderId: number; name: string; logoPath: string | null }[];
  rentProviders?: { tmdbProviderId: number; name: string; logoPath: string | null }[];
}>({
  movies,
  getKey,
  renderActions,
  getOrder,
  viewerServices,
}: {
  movies: T[];
  getKey: (movie: T) => string;
  renderActions: (movie: T) => React.ReactNode;
  getOrder?: (movie: T) => number | undefined;
  viewerServices: Provider[];
}) {
  return (
    <ul className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((movie) => {
        const availability = availabilityForViewer(
          {
            flatrate: movie.providers,
            rent: movie.rentProviders ?? [],
            watchUrl: null,
          },
          viewerServices,
          {
            title: movie.title,
            tmdbMovieId: movie.tmdbMovieId,
            mediaType: movie.mediaType ?? "movie",
          },
        );

        return (
          <li key={getKey(movie)} className="h-full">
            <MovieCard
              title={movie.title}
              year={movie.year}
              posterPath={movie.posterPath}
              overview={movie.overview}
              mediaType={movie.mediaType}
              order={getOrder?.(movie)}
              availability={availability}
              actions={renderActions(movie)}
            />
          </li>
        );
      })}
    </ul>
  );
}
