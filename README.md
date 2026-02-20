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

| Command                       | Action                                              |
| ----------------------------- | --------------------------------------------------- |
| `npm install`                 | Install dependencies                                |
| `npm run dev`                 | Start dev server at `localhost:4321`                |
| `npm run build`               | Build production site to `./dist/`                  |
| `npm run preview`             | Preview production build locally                    |
| `npm run sync`                | Sync player stats from databallr → Supabase         |
| `npm run sync -- 2025`        | Sync a specific season year                         |

## Data Sources

Player stats and metrics are sourced from [databallr](https://api.databallr.com):

```
https://api.databallr.com/api/supabase/player_stats_with_metrics?year=2026&playoffs=0&min_minutes=50&limit=500&order_by=dpm&order_direction=desc
```

Additional play-by-play stats from [PBP Stats](https://api.pbpstats.com/docs#/).

## Supabase Integration

Player data is stored in Supabase so the app always serves its own
database instead of hitting the external API on every request.

### Architecture

```
databallr API
     │
     │  1 call/day (Edge Function + pg_cron)
     ▼
Supabase — player_stats table
     │
     │  fast queries
     ▼
elarostats app  (falls back to local JSON if Supabase is not configured)
```

### Rate-limit strategy

One call to the databallr API refreshes the entire season snapshot
(≈ 500 players in a single response).  The daily cron keeps data
current without ever coming close to any rate limit.

---

## Setup guide

### 1. Create Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the SQL migrations

Open the **SQL Editor** in your Supabase dashboard and paste/run each file
in order:

```
supabase/migrations/001_create_player_stats.sql   ← table + RLS
supabase/migrations/002_setup_cron.sql            ← pg_cron schedule
```

> **Before running `002_setup_cron.sql`** you must enable the
> `pg_cron` and `pg_net` extensions in the dashboard
> (Database → Extensions → search for each one).
>
> Then store your credentials in Vault (replace with real values):
>
> ```sql
> SELECT vault.create_secret('https://xxxx.supabase.co', 'supabase_project_url');
> SELECT vault.create_secret('<service-role-key>',        'supabase_service_role_key');
> ```

### 3. Deploy the Edge Function

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy sync-players
```

The function will be called by pg_cron every day at **08:00 Europe/Madrid**
(DST-aware — always exact regardless of CET/CEST).

You can also invoke it manually at any time:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/sync-players \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable                   | Where to find it                              |
| -------------------------- | --------------------------------------------- |
| `PUBLIC_SUPABASE_URL`      | Project Settings → API → Project URL          |
| `PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon / public key    |
| `SUPABASE_SERVICE_KEY`     | Project Settings → API → service_role key     |

### 5. Initial data load

Run the sync script once to populate the table with current-season data:

```bash
npm run sync
```

---

## Daily automatic sync (two options)

### Option A — Supabase-native (recommended)

The `002_setup_cron.sql` migration sets up everything inside Supabase:

- `pg_cron` schedules a job at **08:00 Europe/Madrid** every day
- `pg_net` makes an HTTP POST to the deployed Edge Function
- The Edge Function fetches from databallr and upserts into `player_stats`

Check the cron history:

```sql
SELECT start_time, status, return_message
FROM   cron.job_run_details
WHERE  jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-players-daily')
ORDER  BY start_time DESC
LIMIT  10;
```

### Option B — GitHub Actions

The workflow at `.github/workflows/sync-players.yml` runs `npm run sync`
on the same schedule (07:00 UTC = 08:00 CET, 09:00 CEST in summer).

Add these secrets to the GitHub repository
(Settings → Secrets → Actions):

| Secret                | Value                          |
| --------------------- | ------------------------------ |
| `SUPABASE_URL`        | Your Supabase project URL      |
| `SUPABASE_SERVICE_KEY`| Your service-role key          |

Trigger manually from the Actions tab or via:

```bash
gh workflow run sync-players.yml
gh workflow run sync-players.yml --field year=2025
```

---

## How the app uses Supabase data

- **When env vars are set** — `getAllPlayers`, `searchPlayers`, and
  `getPlayerById` query the live `player_stats` table in Supabase.
- **Without env vars** — they fall back to the bundled
  `src/data/players.json` so local development works offline.

## API

[https://api.pbpstats.com/docs#/](https://api.pbpstats.com/docs#/)
