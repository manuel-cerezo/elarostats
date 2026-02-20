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

| Command         | Action                                      |
| --------------- | ------------------------------------------- |
| `npm install`   | Install dependencies                        |
| `npm run dev`   | Start dev server at `localhost:4321`         |
| `npm run build` | Build production site to `./dist/`           |
| `npm run preview` | Preview production build locally          |

## API

[https://api.pbpstats.com/docs#/](https://api.pbpstats.com/docs#/)

## Data Sources

Player stats and metrics are sourced from [databallr](https://api.databallr.com):

```
https://api.databallr.com/api/supabase/player_stats_with_metrics?year=2026&playoffs=0&min_minutes=50&limit=500&order_by=dpm&order_direction=desc
```
