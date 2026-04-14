# Job Tool Dashboard

🎨 `Job Tool Dashboard` is a read-only Next.js dashboard for the `Job Tool` engine.

It turns engine data into a cleaner, easier-to-browse interface for:

- 📊 stats and run summaries
- 🔎 search across stored job data
- ⭐ recommendations discovered by explore mode
- 🧾 review history, decisions, answers, and artifacts
- 🧰 script generation for engine commands

## ✨ Overview

This project reads the existing engine workspace and presents its data through a modern dashboard UI.

It currently reads:

- `prisma/dev.db`
- `logs/app.log`
- `artifacts/*`

from the engine workspace configured by `ENGINE_ROOT`.

If `ENGINE_ROOT` is not set, the dashboard falls back to a sibling `../Job Tool` workspace.

## 🧱 Stack

- Next.js
- React
- Tailwind CSS
- better-sqlite3

## 🗂️ Pages

- `/` overview, summary cards, and quick links
- `/search` grouped search across major collections
- `/recommendations` explore-mode recommendations with summaries and scores
- `/run` ready-to-paste PowerShell `tsx` script generation
- `/reviews` review history from `JobReviewHistory`
- `/decisions` detailed application decisions
- `/answers` prepared Easy Apply answer sets and reusable answer memory
- `/artifacts` recent artifacts and previews
- `/companies` firm-level aggregates, logos, LinkedIn URLs, and linked decisions

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local env file

```bash
cp .env.example .env
```

Portable example:

```env
ENGINE_ROOT=../Job Tool
```

### 3. Start the dashboard

```bash
npm run dev
```

## ✅ Verification

```bash
npm run type-check
npm test
npm run build
```

## 📚 Documentation

AI-first file maps live here:

- [docs/README.md](./docs/README.md)
- [docs/FILE_MAP.md](./docs/FILE_MAP.md)

## 📝 Notes

- the dashboard is read-focused by design
- `/run` generates scripts but does not execute them
- `/recommendations` reads `JobRecommendation` rows produced by engine explore mode
- the dashboard stays separate from the engine repo to keep UI concerns isolated
