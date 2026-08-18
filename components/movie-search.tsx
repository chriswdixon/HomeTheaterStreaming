"use client";

import { useEffect, useRef, useState } from "react";
import { fetchNoStore } from "@/lib/http-cache";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import { MoviePoster } from "./movie-card";

export function MovieSearch({
  onSelect,
}: {
  onSelect: (movie: TmdbSearchMovie) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchMovie[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const response = await fetchNoStore(
          `/api/movies/search?q=${encodeURIComponent(trimmed)}`,
        );
        const data = (await response.json()) as {
          movies?: TmdbSearchMovie[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.movies ?? []);
        setOpen(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visibleResults = query.trim().length < 2 ? [] : results;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor="movie-search" className="sr-only">
        Search movies and series to add
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-accent" />
        <input
          id="movie-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => visibleResults.length > 0 && setOpen(true)}
          placeholder="Search movies and series to add…"
          className="glass-input py-4 pr-5 pl-12 text-base"
        />
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      {open && visibleResults.length > 0 ? (
        <ul className="glass absolute z-20 mt-2 max-h-96 w-full overflow-auto rounded-2xl shadow-2xl">
          {visibleResults.map((movie) => (
            <li key={`${movie.mediaType}-${movie.tmdbMovieId}`}>
              <button
                type="button"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await onSelect(movie);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Could not add movie",
                    );
                  } finally {
                    setPending(false);
                  }
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
              >
                <div className="w-10 shrink-0">
                  <MoviePoster title={movie.title} posterPath={movie.posterPath} />
                </div>
                <span>
                  {movie.title}
                  {movie.year ? (
                    <span className="text-muted"> ({movie.year})</span>
                  ) : null}
                  {movie.mediaType === "tv" ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">
                      Series
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
