"use client";

import { useState } from "react";
import { availabilityForViewer } from "@/lib/availability";
import type { Provider } from "@/lib/effective-services";
import type { TopMovie } from "@/lib/server/top-movies";
import { MovieCard } from "./movie-card";

export function TopMoviesView({
  initialMovies,
  viewerServices,
}: {
  initialMovies: TopMovie[];
  viewerServices: Provider[];
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [message, setMessage] = useState<string | null>(null);

  async function addMovie(
    movie: TopMovie,
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
          mediaType: "movie",
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          overview: movie.overview,
        },
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not add movie");
      return;
    }

    setMovies((current) =>
      current.map((row) =>
        row.tmdbMovieId === movie.tmdbMovieId
          ? {
              ...row,
              onPersonalList: list === "personal" ? true : row.onPersonalList,
              onSharedList: list === "shared" ? true : row.onSharedList,
            }
          : row,
      ),
    );
    setMessage(`Added ${movie.title} to ${list === "personal" ? "your list" : "the shared list"}`);
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Top 100 movies</h1>
      <p className="mt-1 text-muted">
        TMDB&apos;s highest-rated films of all time. Add anything you want to
        watch to your list or the shared list.
      </p>
      {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      <ul className="mt-8 grid grid-cols-2 items-stretch gap-4 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((movie) => (
          <li key={movie.tmdbMovieId} className="h-full">
            <MovieCard
              title={movie.title}
              year={movie.year}
              posterPath={movie.posterPath}
              overview={movie.overview}
              mediaType="movie"
              order={movie.rank}
              availability={availabilityForViewer(
                {
                  flatrate: movie.providers,
                  rent: [],
                  watchUrl: null,
                },
                viewerServices,
                {
                  title: movie.title,
                  tmdbMovieId: movie.tmdbMovieId,
                  mediaType: "movie",
                },
              )}
              actions={
                movie.onPersonalList && movie.onSharedList ? (
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted">
                    On both lists
                  </span>
                ) : movie.onPersonalList ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted">
                      On your list
                    </span>
                    {!movie.onSharedList ? (
                      <button
                        type="button"
                        onClick={() => void addMovie(movie, "shared")}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs"
                      >
                        Shared
                      </button>
                    ) : null}
                  </div>
                ) : movie.onSharedList ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void addMovie(movie, "personal")}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black"
                    >
                      My list
                    </button>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-muted">
                      On shared
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void addMovie(movie, "personal")}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-black"
                    >
                      My list
                    </button>
                    <button
                      type="button"
                      onClick={() => void addMovie(movie, "shared")}
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
    </div>
  );
}
