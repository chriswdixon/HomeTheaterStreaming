import { TopMoviesView } from "@/components/top-movies-view";
import { mergeEffectiveServices } from "@/lib/effective-services";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { requirePageMembership } from "@/lib/server/page-session";
import { getTopMoviesPayload } from "@/lib/server/top-movies";
import { createDbWatchlistStore } from "@/lib/server/watchlist-store";
import { createTmdbClient } from "@/lib/tmdb";

export default async function Top100Page() {
  const { userId, membership } = await requirePageMembership();
  const tmdb = createTmdbClient();
  const store = createDbWatchlistStore(membership.householdId);

  const [items, household, personal] = await Promise.all([
    store.listItems(),
    getHouseholdProviders(membership.householdId),
    getPersonalProviders(userId, membership.householdId),
  ]);

  const personalMovieIds = new Set(
    items
      .filter(
        (item) =>
          item.list === "personal" &&
          item.ownerUserId === userId &&
          item.mediaType === "movie",
      )
      .map((item) => item.tmdbMovieId),
  );
  const sharedMovieIds = new Set(
    items
      .filter((item) => item.list === "shared" && item.mediaType === "movie")
      .map((item) => item.tmdbMovieId),
  );

  const movies = await getTopMoviesPayload({
    tmdb,
    region: membership.household.region,
    personalMovieIds,
    sharedMovieIds,
  }).catch(() => []);

  return (
    <TopMoviesView
      initialMovies={movies}
      viewerServices={mergeEffectiveServices(household, personal)}
      availabilityWarning={
        movies.length === 0
          ? "Streaming availability data is sometimes rate-limited. Your lists still work — refresh to load the chart."
          : undefined
      }
    />
  );
}
