# Job Test Dashboard

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
- `artifacts/batch-runs`
- `artifacts/screenshots`

from the engine workspace configured by `ENGINE_ROOT`.

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

## Notes

- The dashboard is read-only.
- It is intended to stay separate from the engine repo to reduce coupling and keep UI concerns out
  of the automation codebase.
