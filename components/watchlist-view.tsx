"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ViewerAvailability } from "@/lib/availability";
import { fetchNoStore } from "@/lib/http-cache";
import {
  filterByContentRatings,
  contentRatingsOnList,
} from "@/lib/content-ratings";
import type { Provider } from "@/lib/effective-services";
import {
  filterByGenres,
  filterWatchlistByServices,
  genresOnList,
  reorderIds,
  visibleWatchlistItems,
} from "@/lib/list-query";
import type { StoredWatchlistItem } from "@/lib/server/watchlist-actions";
import type { HouseholdMemberView } from "@/lib/server/household-members";
import type { TmdbSearchMovie } from "@/lib/tmdb";
import { layoutWatchlistFolders } from "@/lib/watchlist-folders";
import type { WatchState } from "@/lib/watch-state";
import type { WatchlistKind } from "@/lib/watchlist";
import { watchlistItemKey } from "@/lib/default-list-view";
import { sortSharedListItems } from "@/lib/shared-list-votes";
import { ConfirmDialog, RatingDialog } from "./dialogs";
import { HouseholdSharingLightbox } from "./household-sharing-lightbox";
import { HouseholdMembersList } from "./household-members-list";
import { MultiSelectFilter } from "./multi-select-filter";
import { MovieCard } from "./movie-card";
import { MovieSearch } from "./movie-search";

export type WatchlistItemView = StoredWatchlistItem & {
  availability: ViewerAvailability;
  watchState: WatchState | null;
  voteCount?: number;
  votedByCurrentUser?: boolean;
};

export function WatchlistView({
  list,
  title,
  description,
  initialItems,
  showSearch = true,
  allowDrag = true,
  mode = "queue",
  enableSharedVoting = false,
  warning,
  viewerServices = [],
  showServiceFilter = false,
  household,
  initialSharedItemKeys = [],
  members = [],
}: {
  list?: WatchlistKind;
  title: string;
  description: string;
  initialItems: WatchlistItemView[];
  showSearch?: boolean;
  allowDrag?: boolean;
  enableSharedVoting?: boolean;
  mode?: "queue" | "watched";
  warning?: string;
  viewerServices?: Provider[];
  showServiceFilter?: boolean;
  household?: { name: string; inviteCode: string; region: string };
  initialSharedItemKeys?: string[];
  members?: HouseholdMemberView[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState<string | null>(null);
  const [showWatched, setShowWatched] = useState(mode === "watched");
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [contentRatingIds, setContentRatingIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [ratingItem, setRatingItem] = useState<WatchlistItemView | null>(null);
  const [removeItem, setRemoveItem] = useState<WatchlistItemView | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openFolderName, setOpenFolderName] = useState<string | null>(null);
  const [showHouseholdInvite, setShowHouseholdInvite] = useState(false);
  const [sharedItemKeys, setSharedItemKeys] = useState(
    () => new Set(initialSharedItemKeys),
  );

  const states = items
    .map((item) => item.watchState)
    .filter((state): state is WatchState => Boolean(state));

  const displayed = useMemo(() => {
    const byWatch = visibleWatchlistItems(items, states, { showWatched });
    const byGenre = filterByGenres(byWatch, genreIds);
    const byRating = filterByContentRatings(byGenre, contentRatingIds);
    if (!showServiceFilter) return byRating;
    return filterWatchlistByServices(byRating, selectedServiceIds, viewerServices);
  }, [
    contentRatingIds,
    genreIds,
    items,
    selectedServiceIds,
    showServiceFilter,
    showWatched,
    states,
  ]);

  const genres = genresOnList(items);
  const contentRatings = contentRatingsOnList(items);

  const sections = useMemo(
    () => layoutWatchlistFolders(displayed),
    [displayed],
  );

  function toggleFolder(name: string) {
    setOpenFolderName((current) => (current === name ? null : name));
  }

  function renderItem(
    item: WatchlistItemView,
    options?: { order?: number; draggable?: boolean },
  ) {
    const draggable =
      options?.draggable ??
      (allowDrag && !enableSharedVoting && !showWatched && !item.folderName);

    return (
      <MovieCard
        tmdbMovieId={item.tmdbMovieId}
        title={item.title}
        year={item.year}
        posterPath={item.posterPath}
        overview={item.overview}
        availability={item.availability}
        mediaType={item.mediaType}
        order={options?.order ?? item.folderOrder ?? undefined}
        rating={item.watchState?.rating}
        draggable={draggable}
        voteCount={enableSharedVoting ? item.voteCount ?? 0 : undefined}
        votedByCurrentUser={
          enableSharedVoting ? item.votedByCurrentUser ?? false : undefined
        }
        onVote={
          enableSharedVoting ? () => void toggleSharedVote(item) : undefined
        }
        onWatched={item.watchState ? undefined : () => setRatingItem(item)}
        onUnwatch={item.watchState ? () => void unwatch(item) : undefined}
        onCopyToShared={
          item.list === "personal" ? () => void copyToShared(item) : undefined
        }
        onSharedList={
          item.list === "personal"
            ? sharedItemKeys.has(
                watchlistItemKey(item.tmdbMovieId, item.mediaType),
              )
            : undefined
        }
        onRemove={() => setRemoveItem(item)}
      />
    );
  }

  async function addMovie(movie: TmdbSearchMovie) {
    if (!list) return;
    setMessage(null);
    const response = await fetchNoStore("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list, movie }),
    });
    const data = (await response.json()) as {
      item?: WatchlistItemView;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error ?? "Could not add title");
    if (data.item) {
      const nextItem = enableSharedVoting
        ? { ...data.item!, voteCount: 0, votedByCurrentUser: false }
        : data.item!;
      setItems((current) =>
        enableSharedVoting
          ? sortSharedListItems([...current, nextItem])
          : [nextItem, ...current],
      );
      router.refresh();
    }
  }

  async function persistOrder(nextItems: WatchlistItemView[]) {
    setItems(nextItems);
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nextItems.map((item) => item.id) }),
    });
  }

  async function rate(item: WatchlistItemView, rating: number) {
    const response = await fetch("/api/watch-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlistItemId: item.id, rating }),
    });
    const data = (await response.json()) as {
      watchState?: WatchState;
      error?: string;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Could not save rating");
      return;
    }
    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, watchState: data.watchState ?? null } : row,
      ),
    );
    setRatingItem(null);
  }

  async function unwatch(item: WatchlistItemView) {
    const response = await fetch(`/api/watch-state?watchlistItemId=${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage("Could not mark as unwatched");
      return;
    }
    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, watchState: null } : row,
      ),
    );
  }

  async function copyToShared(item: WatchlistItemView) {
    setMessage(null);
    const response = await fetchNoStore("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        list: "shared",
        movie: {
          tmdbMovieId: item.tmdbMovieId,
          mediaType: item.mediaType,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          overview: item.overview,
        },
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (response.status === 409) {
      setSharedItemKeys((current) => {
        const next = new Set(current);
        next.add(watchlistItemKey(item.tmdbMovieId, item.mediaType));
        return next;
      });
      setMessage(`${item.title} is already on the shared list`);
      return;
    }
    if (!response.ok) {
      setMessage(data.error ?? "Could not copy to the shared list");
      return;
    }
    setSharedItemKeys((current) => {
      const next = new Set(current);
      next.add(watchlistItemKey(item.tmdbMovieId, item.mediaType));
      return next;
    });
    setMessage(`Added ${item.title} to the shared list`);
  }

  async function toggleSharedVote(item: WatchlistItemView) {
    setMessage(null);
    const response = await fetchNoStore("/api/shared-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlistItemId: item.id }),
    });
    const data = (await response.json()) as {
      voteCount?: number;
      votedByCurrentUser?: boolean;
      error?: string;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Could not save vote");
      return;
    }

    setItems((current) =>
      sortSharedListItems(
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                voteCount: data.voteCount ?? 0,
                votedByCurrentUser: data.votedByCurrentUser ?? false,
              }
            : row,
        ),
      ),
    );
  }

  async function remove(item: WatchlistItemView) {
    const response = await fetch(`/api/watchlist?id=${item.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Could not remove title");
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
    setRemoveItem(null);
  }

  function onDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const visibleIds = displayed.map((item) => item.id);
    const toIndex = visibleIds.indexOf(targetId);
    const nextVisible = reorderIds(visibleIds, draggingId, toIndex);
    const byId = new Map(items.map((item) => [item.id, item]));
    const hidden = items.filter((item) => !visibleIds.includes(item.id));
    const next = [
      ...nextVisible.map((id) => byId.get(id)!),
      ...hidden,
    ];
    void persistOrder(next);
    setDraggingId(null);
  }

  return (
    <div>
      <div className="page-header-block">
        <div>
          <h1 className="page-title">{title}</h1>
          {household ? (
            <button
              type="button"
              onClick={() => setShowHouseholdInvite(true)}
              className="household-name-button mt-2"
              title="View household invite code"
            >
              {household.name}
            </button>
          ) : null}
          {members.length > 0 ? <HouseholdMembersList members={members} /> : null}
          <p className="mt-1 text-muted">{description}</p>
        </div>
        <p className="text-sm text-muted">{displayed.length} titles</p>
      </div>
      {warning ? (
        <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {warning}
        </p>
      ) : null}
      {showSearch && list ? (
        <div className="search-panel mt-6 rounded-3xl p-4 sm:p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-accent">
            Add to your list
          </p>
          <MovieSearch onSelect={addMovie} />
        </div>
      ) : null}
      {mode === "queue" || genres.length > 0 || contentRatings.length > 0 ? (
        <div className="mobile-filter-bar mt-4">
          {genres.length > 0 ? (
            <MultiSelectFilter
              label="Genre"
              options={genres.map((genre) => ({
                value: genre.tmdbGenreId,
                label: genre.name,
              }))}
              selected={genreIds}
              onChange={setGenreIds}
            />
          ) : null}
          {contentRatings.length > 0 ? (
            <MultiSelectFilter
              label="Rating"
              options={contentRatings.map((rating) => ({
                value: rating,
                label: rating,
              }))}
              selected={contentRatingIds}
              onChange={setContentRatingIds}
            />
          ) : null}
          {showServiceFilter && viewerServices.length > 0 ? (
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
          {mode === "queue" ? (
            <button
              type="button"
              onClick={() => setShowWatched((current) => !current)}
              title={showWatched ? "Show unwatched" : "Show watched"}
              className="group relative shrink-0 rounded-full bg-accent px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/80"
            >
              {showWatched ? "Watched" : "Unwatched"}
              <span
                role="tooltip"
                className="app-tooltip pointer-events-none absolute bottom-[calc(100%+0.4rem)] right-0 z-10 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
              >
                {showWatched ? "Show unwatched" : "Show watched"}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p
          className={`mt-3 text-sm ${
            message.startsWith("Could") ? "text-red-300" : "text-accent"
          }`}
        >
          {message}
        </p>
      ) : null}
      {displayed.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-4 py-12 text-center md:px-6 md:py-16">
          <h2 className="text-xl font-medium">
            {items.length === 0 ? "Nothing queued yet" : "No titles match"}
          </h2>
          <p className="mt-2 text-muted">
            {items.length === 0
              ? "Search above to add a movie or series."
              : "Try another genre, rating, service, or watched filter."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {sections.map((section) => {
            if (section.type === "folder") {
              const open = openFolderName === section.folder.name;
              return (
                <section
                  key={section.folder.name}
                  className="franchise-folder-panel"
                >
                  <button
                    type="button"
                    onClick={() => toggleFolder(section.folder.name)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={open}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-accent">
                        Franchise
                      </p>
                      <h2 className="mt-1 text-lg font-medium">
                        {section.folder.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {open ? "Open" : "Click to open"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-muted">
                      {section.folder.items.length} titles {open ? "▾" : "▸"}
                    </span>
                  </button>
                  {open ? (
                    <ul className="title-grid mt-4 p-1">
                      {section.folder.items.map((item) => (
                        <li key={item.id} className="h-full">
                          {renderItem(item, { order: item.folderOrder ?? undefined })}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              );
            }

            return (
              <ul
                key="loose-items"
                className="title-grid"
              >
                {section.items.map((item) => (
                  <li
                    key={item.id}
                    draggable={allowDrag && !showWatched}
                    onDragStart={() => setDraggingId(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => onDrop(item.id)}
                    className="h-full"
                  >
                    {renderItem(item)}
                  </li>
                ))}
              </ul>
            );
          })}
        </div>
      )}
      {ratingItem ? (
        <RatingDialog
          title={ratingItem.title}
          onCancel={() => setRatingItem(null)}
          onRate={(value) => void rate(ratingItem, value)}
        />
      ) : null}
      {removeItem ? (
        <ConfirmDialog
          title={`Remove ${removeItem.title}?`}
          message="This takes it off the list for everyone who can see this queue."
          confirmLabel="Remove"
          onCancel={() => setRemoveItem(null)}
          onConfirm={() => void remove(removeItem)}
        />
      ) : null}
      {showHouseholdInvite && household ? (
        <HouseholdSharingLightbox
          householdName={household.name}
          inviteCode={household.inviteCode}
          region={household.region}
          onClose={() => setShowHouseholdInvite(false)}
        />
      ) : null}
    </div>
  );
}
