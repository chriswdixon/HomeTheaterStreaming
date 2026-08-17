import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Provider } from "@/lib/effective-services";

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
    tmdbMovieId: integer("tmdb_movie_id").notNull(),
    title: text("title").notNull(),
    year: text("year"),
    posterPath: text("poster_path"),
    overview: text("overview"),
    cachedFlatrateProviders: jsonb("cached_flatrate_providers")
      .$type<Provider[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    addedByUserId: text("added_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("watchlist_shared_unique")
      .on(table.householdId, table.tmdbMovieId)
      .where(sql`${table.list} = 'shared'`),
    uniqueIndex("watchlist_personal_unique")
      .on(table.householdId, table.ownerUserId, table.tmdbMovieId)
      .where(sql`${table.list} = 'personal'`),
  ],
);
