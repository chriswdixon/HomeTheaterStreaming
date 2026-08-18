"use client";

import type { ReactNode } from "react";
import type { Provider } from "@/lib/effective-services";
import { availabilityForViewer } from "@/lib/availability";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import { ListAddButtons } from "./list-add-buttons";
import { MovieCard } from "./movie-card";

export type FranchiseFolderMovie = {
  tmdbMovieId: number;
  mediaType?: TmdbSearchMovie["mediaType"];
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  order?: number;
  onList?: boolean;
  providers: { tmdbProviderId: number; name: string; logoPath: string | null }[];
  rentProviders?: { tmdbProviderId: number; name: string; logoPath: string | null }[];
};

export type FranchiseAddPayload = {
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
};

export type FranchiseFolderData = {
  key: string;
  name: string;
  subtitle: string;
  showOrder: boolean;
  movies: FranchiseFolderMovie[];
};

export function FranchiseFolderRow({
  folders,
  openKey,
  onOpenKeyChange,
  onAddFranchise,
  onAddMovie,
  viewerServices,
  renderMovieActions,
}: {
  folders: FranchiseFolderData[];
  openKey: string | null;
  onOpenKeyChange: (key: string | null) => void;
  onAddFranchise: (folder: FranchiseAddPayload, list: "personal" | "shared") => void;
  onAddMovie: (
    movie: Pick<
      FranchiseFolderMovie,
      "tmdbMovieId" | "mediaType" | "title" | "year" | "posterPath" | "overview"
    >,
    list: "personal" | "shared",
  ) => void;
  viewerServices: Provider[];
  renderMovieActions?: (movie: FranchiseFolderMovie) => ReactNode;
}) {
  const openFolder = folders.find((folder) => folder.key === openKey) ?? null;

  return (
    <div className="space-y-5">
      <div className="franchise-folder-row">
        <ul className="flex min-w-0 gap-4">
          {folders.map((folder) => (
            <li key={folder.key} className="franchise-folder-item">
              <FranchiseFolderCard
                folder={folder}
                open={openKey === folder.key}
                onOpen={() =>
                  onOpenKeyChange(openKey === folder.key ? null : folder.key)
                }
                onAddFranchise={onAddFranchise}
              />
            </li>
          ))}
        </ul>
      </div>

      {openFolder ? (
        <FranchiseFolderPanel
          folder={openFolder}
          onClose={() => onOpenKeyChange(null)}
          onAddFranchise={onAddFranchise}
          onAddMovie={onAddMovie}
          viewerServices={viewerServices}
          renderMovieActions={renderMovieActions}
        />
      ) : null}
    </div>
  );
}

function FranchiseFolderCard({
  folder,
  open,
  onOpen,
  onAddFranchise,
}: {
  folder: FranchiseFolderData;
  open: boolean;
  onOpen: () => void;
  onAddFranchise: (folder: FranchiseAddPayload, list: "personal" | "shared") => void;
}) {
  const payload = franchisePayload(folder);

  return (
    <article
      className={`franchise-folder-card ${open ? "franchise-folder-card-open" : ""}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-start gap-2 text-left"
        aria-expanded={open}
      >
        <span className="franchise-folder-tab">Folder</span>
        <span className="text-lg font-medium leading-snug">{folder.name}</span>
        <span className="text-sm text-muted">{folder.subtitle}</span>
        <span className="text-xs text-muted">
          {folder.movies.length} titles · {open ? "Open" : "Click to open"}
        </span>
      </button>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onAddFranchise(payload, "personal")}
          className="action-btn-pill action-btn-add w-full px-3 py-2 text-xs"
        >
          Add folder to My list
        </button>
        <button
          type="button"
          onClick={() => onAddFranchise(payload, "shared")}
          className="action-btn-pill action-btn-add w-full px-3 py-2 text-xs"
        >
          Add folder to Shared
        </button>
      </div>
    </article>
  );
}

function FranchiseFolderPanel({
  folder,
  onClose,
  onAddFranchise,
  onAddMovie,
  viewerServices,
  renderMovieActions,
}: {
  folder: FranchiseFolderData;
  onClose: () => void;
  onAddFranchise: (folder: FranchiseAddPayload, list: "personal" | "shared") => void;
  onAddMovie: (
    movie: Pick<
      FranchiseFolderMovie,
      "tmdbMovieId" | "mediaType" | "title" | "year" | "posterPath" | "overview"
    >,
    list: "personal" | "shared",
  ) => void;
  viewerServices: Provider[];
  renderMovieActions?: (movie: FranchiseFolderMovie) => ReactNode;
}) {
  const payload = franchisePayload(folder);

  return (
    <section className="franchise-folder-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Open folder</p>
          <h3 className="mt-1 text-xl font-medium">{folder.name}</h3>
          <p className="mt-1 text-sm text-muted">{folder.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="franchise-folder-close rounded-full px-3 py-1.5 text-sm text-muted"
        >
          Close folder
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAddFranchise(payload, "personal")}
          className="action-btn-pill action-btn-add px-3 py-1.5 text-xs"
        >
          Add folder to My list
        </button>
        <button
          type="button"
          onClick={() => onAddFranchise(payload, "shared")}
          className="action-btn-pill action-btn-add px-3 py-1.5 text-xs"
        >
          Add folder to Shared
        </button>
      </div>
      <ul className="mt-5 grid grid-cols-2 items-stretch gap-4 overflow-visible p-1 md:grid-cols-4 lg:grid-cols-5">
        {folder.movies.map((movie) => {
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

          const actions =
            renderMovieActions?.(movie) ??
            (movie.onList ? (
              <span className="action-btn-pill card-action-button w-full border border-white/15 text-center text-sm text-muted">
                On your list
              </span>
            ) : (
              <ListAddButtons movie={movie} onAdd={onAddMovie} />
            ));

          return (
            <li key={`${folder.key}-${movie.tmdbMovieId}`} className="h-full">
              <MovieCard
                tmdbMovieId={movie.tmdbMovieId}
                title={movie.title}
                year={movie.year}
                posterPath={movie.posterPath}
                overview={movie.overview}
                mediaType={movie.mediaType}
                order={folder.showOrder ? movie.order : undefined}
                availability={availability}
                actions={actions}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function franchisePayload(folder: FranchiseFolderData): FranchiseAddPayload {
  return {
    name: folder.name,
    movies: folder.movies.map((movie, index) => ({
      tmdbMovieId: movie.tmdbMovieId,
      mediaType: movie.mediaType,
      title: movie.title,
      year: movie.year,
      posterPath: movie.posterPath,
      overview: movie.overview,
      order: movie.order ?? index + 1,
    })),
  };
}
