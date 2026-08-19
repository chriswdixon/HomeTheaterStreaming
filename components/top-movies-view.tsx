"use client";

import { useState } from "react";
import { availabilityForViewer } from "@/lib/availability";
import type { Provider } from "@/lib/effective-services";
import type { TopMovie } from "@/lib/server/top-movies";
import { ListAddButtons, ListStatusIcon } from "./list-add-buttons";
import { CardIconButton } from "./card-action-buttons";
import { PlusIcon, SharedIcon } from "./icons";
import { MovieCard } from "./movie-card";

export function TopMoviesView({
  initialMovies,
  viewerServices,
  availabilityWarning,
}: {
  initialMovies: TopMovie[];
  viewerServices: Provider[];
  availabilityWarning?: string;
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
      <h1 className="page-title">Top 100 movies</h1>
      <p className="mt-1 text-muted">
        TMDB&apos;s highest-rated films of all time. Add anything you want to
        watch to your list or the shared list.
      </p>
      {availabilityWarning ? (
        <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {availabilityWarning}
        </p>
      ) : null}
      {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      <ul className="title-grid mt-6 md:mt-8">
        {movies.map((movie) => (
          <li key={movie.tmdbMovieId} className="h-full">
            <MovieCard
              tmdbMovieId={movie.tmdbMovieId}
              title={movie.title}
              year={movie.year}
              posterPath={movie.posterPath}
              overview={movie.overview}
              mediaType="movie"
              order={movie.rank}
              showServices={false}
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
                  <>
                    <ListStatusIcon label="On your list" />
                    <ListStatusIcon label="On shared list" />
                  </>
                ) : movie.onPersonalList ? (
                  <>
                    <ListStatusIcon label="On your list" />
                    {!movie.onSharedList ? (
                      <CardIconButton
                        label="Add to shared list"
                        tone="shared"
                        icon={<SharedIcon className="h-5 w-5" />}
                        onClick={() => void addMovie(movie, "shared")}
                      />
                    ) : null}
                  </>
                ) : movie.onSharedList ? (
                  <>
                    <CardIconButton
                      label="Add to my list"
                      tone="add"
                      icon={<PlusIcon className="h-5 w-5" />}
                      onClick={() => void addMovie(movie, "personal")}
                    />
                    <ListStatusIcon label="On shared list" />
                  </>
                ) : (
                  <ListAddButtons movie={movie} onAdd={addMovie} />
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
