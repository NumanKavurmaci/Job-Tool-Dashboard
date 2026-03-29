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

## Pages

- `/`
  - high-level overview
  - stats
  - engine workspace summary
  - quick links into the deeper views
- `/search`
  - search across every major collection
  - grouped results under separate collection headings
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

- The dashboard is read-only.
- It is intended to stay separate from the engine repo to reduce coupling and keep UI concerns out
  of the automation codebase.
