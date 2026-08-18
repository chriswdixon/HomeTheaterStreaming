# Watchlist queue, ratings, TV, and series recs

## Decisions

- Titles are movies or whole TV series (one card per show).
- Cards are equal height. Actions are icon-only **Watched** and **Remove**.
- Remove asks for confirmation.
- Watched opens a 5-star popup. A star is required; cancel leaves the title unwatched.
- Watched/rating is per household member. Unwatch returns that title to that member’s unwatched queue.
- My list and Shared default to unwatched. A Watched filter shows that member’s rated titles on that list.
- Recently watched is a nav page of personal + shared titles that member has rated, newest first.
- Genre chips filter the current list (OR a selected genre).
- Drag-and-drop persists `sortOrder` on My list and Shared (shared: last save wins).
- If 2+ personal movies share a TMDB collection, remaining collection titles are recommended.
- If 2+ personal movies share a franchise keyword (MCU, Star Wars, and similar), remaining franchise titles are recommended.
- Recs still require 10 personal titles (movie or TV) and still filter to effective streaming services.
