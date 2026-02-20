# elarostats

NBA stats, analytics, and insights — all in one place.

Built with [Astro](https://astro.build), React, TypeScript, and Tailwind CSS.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

## Commands

| Command              | Action                                              |
| -------------------- | --------------------------------------------------- |
| `npm install`        | Install dependencies                                |
| `npm run dev`        | Start dev server at `localhost:4321`                |
| `npm run build`      | Build production site to `./dist/`                  |
| `npm run preview`    | Preview production build locally                    |
| `npm run sync`       | Sync player stats from databallr → Supabase         |
| `npm run sync 2025`  | Sync a specific season year                         |

## Data Sources

Player stats and metrics are sourced from [databallr](https://api.databallr.com):

```
https://api.databallr.com/api/supabase/player_stats_with_metrics?year=2026&playoffs=0&min_minutes=50&limit=500&order_by=dpm&order_direction=desc
```

Additional play-by-play stats from [PBP Stats](https://api.pbpstats.com/docs#/).

## Supabase Integration

Player data is stored in Supabase for fast queries from the app's own
database, avoiding repeated calls to the external API.

### How it works

```
databallr API  ──(npm run sync)──►  Supabase (player_stats table)
                                           │
                                           ▼
                              elarostats app reads from here
                              (falls back to local JSON if Supabase
                               is not configured)
```

### Rate-limit strategy

One call to the databallr API refreshes the entire season snapshot.
Run the sync on a schedule (e.g. once a day via a cron job or CI
workflow) to keep data current without ever coming close to rate limits.

### Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).

2. Run the migration in the Supabase SQL editor:

   ```sql
   -- paste the contents of supabase/migrations/001_create_player_stats.sql
   ```

3. Copy `.env.example` to `.env` and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   | Variable                | Where to find it                              |
   | ----------------------- | --------------------------------------------- |
   | `PUBLIC_SUPABASE_URL`   | Project Settings → API → Project URL          |
   | `PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon / public key |
   | `SUPABASE_SERVICE_KEY`  | Project Settings → API → service_role key     |

4. Sync player data for the current season:

   ```bash
   npm run sync
   ```

   Or for a specific year:

   ```bash
   npm run sync 2025
   ```

### How the app uses the data

- **When Supabase env vars are set** — the app reads players from
  Supabase at build time (static generation) and on the client side.
- **Without env vars** — the app falls back to the bundled
  `src/data/players.json` so development always works offline.

## API

[https://api.pbpstats.com/docs#/](https://api.pbpstats.com/docs#/)
