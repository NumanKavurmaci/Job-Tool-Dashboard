# Job Tool Dashboard

External read-only dashboard for the Job Tool engine.

## Stack

- Next.js
- React
- Tailwind CSS
- better-sqlite3

## Purpose

This project reads the existing engine workspace and turns its database, logs, and artifacts into
a dark modern dashboard.

It currently reads:

- `prisma/dev.db`
- `logs/app.log`
- `artifacts/*`

from the engine workspace configured by `ENGINE_ROOT`.

It can also generate engine scripts from the dashboard via the new run page.

## Pages

- `/`
  - high-level overview
  - stats
  - engine workspace summary
  - quick links into the deeper views
- `/search`
  - search across every major collection
  - grouped results under separate collection headings
- `/run`
  - generate ready-to-paste PowerShell `tsx` scripts
  - configure script options from a left-side panel
  - use the generated script manually in terminal when needed
- `/reviews`
  - review history rows from `JobReviewHistory`
- `/decisions`
  - detailed application decisions from `ApplicationDecision`
- `/answers`
  - prepared Easy Apply answer sets and reusable answer memory
- `/artifacts`
  - recent run artifacts and previews
- `/companies`
  - firm-level aggregates, logos, LinkedIn URLs, and linked decisions

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env file if needed:

```bash
cp .env.example .env
```

3. Start the dashboard:

```bash
npm run dev
```

## Verification

```bash
npm run type-check
npm test
npm run build
```

## Documentation

AI-first file maps live in:

- [docs/README.md](./docs\README.md)
- [docs/FILE_MAP.md](./docs\FILE_MAP.md)

## Notes

- Most pages are still read-focused, and `/run` now focuses on script generation rather than execution.
- The dashboard is still kept separate from the engine repo to reduce coupling and keep UI concerns
  out of the automation codebase.
