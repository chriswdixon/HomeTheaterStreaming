"use client";

type ListMovie = {
  tmdbMovieId: number;
  mediaType?: "movie" | "tv";
  title: string;
  year: string | null;
  posterPath: string | null;
  overview?: string;
};

export function ListAddButtons<T extends ListMovie>({
  movie,
  onAdd,
}: {
  movie: T;
  onAdd: (movie: T, list: "personal" | "shared") => void | Promise<void>;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onAdd(movie, "personal")}
        className="action-btn-pill action-btn-add card-action-button w-full"
      >
        My list
      </button>
      <button
        type="button"
        onClick={() => onAdd(movie, "shared")}
        className="action-btn-pill action-btn-shared card-action-button w-full"
      >
        Shared
      </button>
    </>
  );
}
