"use client";

import { useState } from "react";
import type { RecommendationGroup } from "@/lib/recommendations";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import { MovieCard } from "./movie-card";

export function RecommendationsView({
  initial,
}: {
  initial:
    | { unlocked: false; count: number; needed: number }
    | { unlocked: true; count: number; needed: number; groups: RecommendationGroup[] };
}) {
  const [payload, setPayload] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  async function addMovie(
    movie: Omit<TmdbSearchMovie, "overview"> & { overview?: string },
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

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Recommendations</h1>
      <p className="mt-1 text-muted">
        Based on your personal list, grouped by the services you can actually watch
        on.
      </p>
      {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      {payload.groups.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">No matches right now</h2>
          <p className="mt-2 text-muted">
            We couldn&apos;t find streaming titles on your current services that
            aren&apos;t already on a list. Add more movies or more services.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {payload.groups.map((group) => (
            <section key={group.provider.tmdbProviderId}>
              <h2 className="mb-4 text-xl font-medium">{group.provider.name}</h2>
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                {group.movies.map((movie) => (
                  <li key={`${group.provider.tmdbProviderId}-${movie.tmdbMovieId}`}>
                    <MovieCard
                      title={movie.title}
                      year={movie.year}
                      posterPath={movie.posterPath}
                      overview={movie.overview}
                      availability={{
                        available: true,
                        onServices: movie.providers,
                        rentOffer: null,
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
