"use client";

import { useState } from "react";
import type { AffinityGroup, WatchOrderGroup } from "@/lib/recommendations";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import { MovieCard } from "./movie-card";

export function RecommendationsView({
  initial,
}: {
  initial:
    | { unlocked: false; count: number; needed: number }
    | {
        unlocked: true;
        count: number;
        needed: number;
        watchOrderGroups?: WatchOrderGroup[];
        affinityGroups?: AffinityGroup[];
      };
}) {
  const [payload, setPayload] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

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
    const response = await fetch("/api/watchlist", {
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

    const refresh = await fetch("/api/recommendations");
    const next = (await refresh.json()) as typeof payload;
    if (refresh.ok) setPayload(next);
    setMessage(`Added to ${list === "personal" ? "your list" : "the shared list"}`);
  }

  if (!payload.unlocked) {
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

  const watchOrderGroups = payload.watchOrderGroups ?? [];
  const affinityGroups = payload.affinityGroups ?? [];
  const hasRecommendations =
    watchOrderGroups.length > 0 || affinityGroups.length > 0;

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Recommendations</h1>
      <p className="mt-1 text-muted">
        Based on franchises and series on your personal list, not limited to the
        services you subscribe to.
      </p>
      {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      {!hasRecommendations ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">No franchise matches yet</h2>
          <p className="mt-2 text-muted">
            Add at least two titles from the same collection or franchise to see
            more from that series.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {watchOrderGroups.map((group) => (
            <section key={group.name}>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                {group.orderLabel === "first-watch"
                  ? "First-watch order"
                  : "Release order"}
              </p>
              <h2 className="mb-4 text-xl font-medium">{group.name}</h2>
              <ul className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4 lg:grid-cols-5">
                {group.movies.map((movie) => (
                  <li
                    key={`${group.name}-${movie.tmdbMovieId}`}
                    className="h-full"
                  >
                    <MovieCard
                      title={movie.title}
                      year={movie.year}
                      posterPath={movie.posterPath}
                      overview={movie.overview}
                      mediaType={movie.mediaType}
                      order={movie.order}
                      availability={{
                        available: movie.providers.length > 0,
                        onServices: movie.providers,
                        rentOffer: null,
                        openTarget: null,
                      }}
                      actions={
                        movie.onList ? (
                          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted">
                            On your list
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => addMovie(movie, "personal")}
                              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black"
                            >
                              My list
                            </button>
                            <button
                              type="button"
                              onClick={() => addMovie(movie, "shared")}
                              className="rounded-full border border-white/15 px-3 py-1 text-xs"
                            >
                              Shared
                            </button>
                          </>
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {affinityGroups.map((group) => (
            <section key={group.name}>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                Because you added 2+
              </p>
              <h2 className="mb-4 text-xl font-medium">{group.name}</h2>
              <ul className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-4 lg:grid-cols-5">
                {group.movies.map((movie) => (
                  <li
                    key={`${group.name}-${movie.tmdbMovieId}`}
                    className="h-full"
                  >
                    <MovieCard
                      title={movie.title}
                      year={movie.year}
                      posterPath={movie.posterPath}
                      overview={movie.overview}
                      mediaType={movie.mediaType}
                      availability={{
                        available: movie.providers.length > 0,
                        onServices: movie.providers,
                        rentOffer: null,
                        openTarget: null,
                      }}
                      actions={
                        <>
                          <button
                            type="button"
                            onClick={() => addMovie(movie, "personal")}
                            className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black"
                          >
                            My list
                          </button>
                          <button
                            type="button"
                            onClick={() => addMovie(movie, "shared")}
                            className="rounded-full border border-white/15 px-3 py-1 text-xs"
                          >
                            Shared
                          </button>
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
