# ScreenStack

A household movie watchlist for Vercel. Share a family queue, keep a personal list, track which streaming services you subscribe to, and get recommendations after 10 personal picks.

Movie metadata and similar-title recommendations come from [TMDB](https://www.themoviedb.org/). Streaming availability is TMDB data powered by [JustWatch](https://www.justwatch.com/).

## What it does

- Sign in with Clerk (email or Google, depending on your Clerk settings)
- Create a household or join with an invite code
- Pick a country so availability matches your catalog
- Choose household streaming services; each person can add personal add-ons
- Search and add movies to **My list** or the **Shared list**
- See which of *your* services a title streams on
- After 10 movies on your personal list, get up to 5 recommendations per service

## Setup

You need free accounts for:

1. [Clerk](https://clerk.com/) — authentication
2. [Neon](https://neon.tech/) — Postgres
3. [TMDB](https://www.themoviedb.org/settings/api) — API read access token (v4)

Copy environment variables:

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API keys |
| `DATABASE_URL` | Neon connection string (pooled / `-pooler` is fine) |
| `TMDB_ACCESS_TOKEN` | TMDB → Settings → API → API Read Access Token |

In Clerk, set the sign-in/sign-up URLs to `/sign-in` and `/sign-up`, and the after-sign-in/up redirects to `/my-list` and `/onboarding`.

Push the schema to Neon:

```bash
npm install
npm run db:push
```

Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

```bash
npx vercel
```

Add the same environment variables in the Vercel project settings, then run `npm run db:push` against the Neon database once (locally is fine). Redeploy after env vars are set.

## Scripts

```bash
npm test          # unit tests
npm run lint
npm run build
npm run db:push   # apply schema to Neon
```

## Product notes

- v1 is movies only
- One household per user
- Recommendations use your personal list, filtered to household services plus your add-ons
- Availability badges use subscription (`flatrate`) providers, not rent/buy
