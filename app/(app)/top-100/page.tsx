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

  try {
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
    });

    return (
      <TopMoviesView
        initialMovies={movies}
        viewerServices={mergeEffectiveServices(household, personal)}
      />
    );
  } catch {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Top 100 movies</h1>
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-xl font-medium">Could not load the chart</h2>
          <p className="mt-2 text-muted">
            TMDB may be rate-limiting. Refresh to try again.
          </p>
          <a
            href="/top-100"
            className="mt-6 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-medium text-black"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }
}
