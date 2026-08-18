import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { Provider } from "@/lib/effective-services";
import type { Genre, Keyword, MediaType } from "@/lib/media";

export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  region: text("region").notNull().default("US"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);

export const householdSubscriptions = pgTable(
  "household_subscriptions",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    tmdbProviderId: integer("tmdb_provider_id").notNull(),
    name: text("name").notNull(),
    logoPath: text("logo_path"),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.tmdbProviderId] }),
  ],
);

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    userId: text("user_id").notNull(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    tmdbProviderId: integer("tmdb_provider_id").notNull(),
    name: text("name").notNull(),
    logoPath: text("logo_path"),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.householdId, table.tmdbProviderId],
    }),
  ],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    list: text("list").notNull(),
    ownerUserId: text("owner_user_id"),
    mediaType: text("media_type").$type<MediaType>().notNull().default("movie"),
    tmdbMovieId: integer("tmdb_movie_id").notNull(),
    title: text("title").notNull(),
    year: text("year"),
    posterPath: text("poster_path"),
    overview: text("overview"),
    genres: jsonb("genres").$type<Genre[]>().notNull().default(sql`'[]'::jsonb`),
    keywords: jsonb("keywords")
      .$type<Keyword[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    collectionId: integer("collection_id"),
    collectionName: text("collection_name"),
    sortOrder: integer("sort_order").notNull().default(0),
    cachedFlatrateProviders: jsonb("cached_flatrate_providers")
      .$type<Provider[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    cachedRentProviders: jsonb("cached_rent_providers")
      .$type<Provider[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    watchUrl: text("watch_url"),
    addedByUserId: text("added_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("watchlist_shared_unique")
      .on(table.householdId, table.mediaType, table.tmdbMovieId)
      .where(sql`${table.list} = 'shared'`),
    uniqueIndex("watchlist_personal_unique")
      .on(
        table.householdId,
        table.ownerUserId,
        table.mediaType,
        table.tmdbMovieId,
      )
      .where(sql`${table.list} = 'personal'`),
  ],
);

export const userWatchStates = pgTable(
  "user_watch_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    watchlistItemId: uuid("watchlist_item_id")
      .notNull()
      .references(() => watchlistItems.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    watchedAt: timestamp("watched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("user_watch_states_unique").on(table.userId, table.watchlistItemId),
  ],
);
