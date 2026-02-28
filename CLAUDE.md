# CLAUDE.md — elarostats

NBA stats, analytics, and insights web application.

## Tech Stack

- **Framework**: Astro 5 (SSG) + React 19 (islands architecture)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3 (class-based dark mode)
- **Database**: Supabase (PostgreSQL + Edge Functions + RLS)
- **Data Fetching**: TanStack Query 5
- **UI Primitives**: Radix UI
- **Testing**: Vitest + Testing Library
- **Deployment**: Vercel

## Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Dev server (localhost:4321)                |
| `npm run build`        | Production build → `./dist/`               |
| `npm run preview`      | Preview production build                   |
| `npm run lint`         | ESLint check                               |
| `npm run lint:fix`     | ESLint auto-fix                            |
| `npm run format`       | Prettier format all                        |
| `npm run format:check` | Prettier check                             |
| `npm run test`         | Run Vitest                                 |
| `npm run test:ui`      | Vitest UI dashboard                        |
| `npm run sync`         | Sync player data from Databallr → Supabase |

## Project Structure

```
src/
├── api/          # API clients (PBPStats, Supabase, Databallr)
├── components/   # React components (islands)
├── context/      # React Context (ThemeContext, LanguageContext)
├── hooks/        # Custom hooks (useAllPlayers, useLiveGamesData, etc.)
├── i18n/         # Translations (es.ts, en.ts) — default: Spanish
├── lib/          # Supabase client, ReactQueryProvider
├── pages/        # Astro file-based routing
├── types/        # TypeScript interfaces (Player, ParsedLiveGame)
├── constants/    # App constants (CDN URLs, limits)
├── utils/        # Formatting helpers (percentage, decimal, signed)
├── data/         # Static fallback data (teams.json)
├── styles/       # Global CSS (Tailwind directives)
└── assets/       # Team logo SVGs
supabase/
├── migrations/   # SQL migrations (player_stats, teams, cron)
└── functions/    # Edge Functions (sync-players)
scripts/          # CLI scripts for data sync
```

## Architecture & Patterns

### Islands Architecture

- Pages are static Astro (`.astro`) components
- Interactive parts use React islands with `client:only="react"`
- Pattern: `*WithQuery` wrapper components provide TanStack Query context

### Data Fetching

- TanStack Query with 5 min stale time, 30 min GC time, 1 retry
- Custom hooks: `useAllPlayers`, `useLiveGamesData`, `useTeamPlayers`, etc.
- Live games poll every 30 seconds via PBPStats API
- Dual source: Supabase primary, local JSON fallback

### State Management

- **ThemeContext**: dark/light mode persisted in localStorage
- **LanguageContext**: ES/EN i18n with localStorage (`elarostats-lang`)
- Both sync across tabs via `storage` events

### Routing

- File-based via Astro: `/pages/players/[id].astro`, `/pages/teams/[id].astro`
- Dynamic routes pre-rendered with `getStaticPaths()` from Supabase data

## Code Conventions

### Formatting (Prettier)

- Double quotes, semicolons, trailing commas
- 2-space indentation, 100 char line width
- Plugins: prettier-plugin-astro, prettier-plugin-tailwindcss

### Naming

- Components: PascalCase (`PlayersView.tsx`)
- Hooks: `use` prefix camelCase (`useAllPlayers.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_SEARCH_RESULTS`)
- Types/Interfaces: PascalCase (`Player`, `ParsedLiveGame`)

### React

- Functional components only, no class components
- `.tsx` extension for all React files
- JSX transform (no `import React` needed)

### Styling

- Utility-first Tailwind CSS
- Dark mode via `dark:` prefix
- Orange accent theme: `text-orange-500`
- Responsive: mobile-first with `sm:` breakpoint

### i18n

- Default language: Spanish (ES)
- Usage: `const { t } = useLanguage()` → `t("key")`
- Translation files in `src/i18n/{es,en}.ts`

## Environment Variables

```
PUBLIC_SUPABASE_URL     # Supabase project URL
PUBLIC_SUPABASE_ANON    # Supabase anon key (public)
SUPABASE_SERVICE_KEY    # Supabase service key (build-time only)
```

## External APIs

- **PBPStats** (`api.pbpstats.com`): Live game data
- **Databallr**: Player stats (DPM, RAPM, TS%, archetypes)
- **NBA CDN**: Player headshots, team logos

## Database

- Main table: `player_stats` with RLS (public read-only)
- Daily sync via `pg_cron` at 08:00 Europe/Madrid
- Edge Function upserts in batches of 100, keyed by `nba_id`

## Specific things to take into account

- Add under ## Architecture or ## Data Layer section in CLAUDE.md\n\nData persistence uses Supabase, NOT local JSON files. When adding new data sources or tables, always use Supabase. Do not default to JSON-only storage.
- Add under ## Git Workflow section in CLAUDE.md\n\nWhen working in a git worktree, always verify which directory you're in (worktree vs main) before running dev servers or making changes. Run `git log --oneline -5` to confirm the branch state before starting work.
- Add under ## UI/CSS Guidelines section in CLAUDE.md\n\nWhen fixing CSS/layout issues (especially dialog overlays, modals, layout shift), verify the fix works in the browser preview BEFORE moving on. If a CSS fix doesn't work after 2 attempts, pause and ask the user for more context rather than continuing to iterate.
