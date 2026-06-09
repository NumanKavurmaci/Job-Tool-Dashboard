# 🗺️ Dashboard File Map

This map explains where dashboard behavior lives.

## 🧱 Root

| File | Responsibility |
| --- | --- |
| [README.md](../README.md) | Public GitHub-facing overview, setup, pages, run control, and API surface. |
| [package.json](../package.json) | Scripts, dependencies, and test commands. |
| [.env.example](../.env.example) | Minimal `ENGINE_ROOT` example. |
| [next.config.ts](../next.config.ts) | Next.js configuration. |
| [tailwind.config.ts](../tailwind.config.ts) | Dashboard theme and Tailwind content paths. |
| [vitest.config.ts](../vitest.config.ts) | Vitest config and path aliases. |

## 📄 Pages

| Page | File | Responsibility |
| --- | --- | --- |
| Overview | [app/page.tsx](../app/page.tsx) | Summary cards, analytics, logs, and navigation links. |
| Search | [app/search/page.tsx](../app/search/page.tsx) | Cross-collection search. |
| Recommendations | [app/recommendations/page.tsx](../app/recommendations/page.tsx) | Explore-mode recommendation inbox. |
| Run | [app/run/page.tsx](../app/run/page.tsx) | Dashboard run-control screen. |
| Reviews | [app/reviews/page.tsx](../app/reviews/page.tsx) | Review history table. |
| Decisions | [app/decisions/page.tsx](../app/decisions/page.tsx) | Detailed scoring and decision records. |
| Answers | [app/answers/page.tsx](../app/answers/page.tsx) | Prepared answers and answer memory. |
| Artifacts | [app/artifacts/page.tsx](../app/artifacts/page.tsx) | Artifact index. |
| Artifact Detail | [app/artifacts/[id]/page.tsx](../app/artifacts/%5Bid%5D/page.tsx) | Individual run report and diagnostics. |
| Companies | [app/companies/page.tsx](../app/companies/page.tsx) | Firm/company aggregates. |

## 🧩 Local API Routes

| Route | File | Responsibility |
| --- | --- | --- |
| `GET /api/config/status` | [app/api/config/status/route.ts](../app/api/config/status/route.ts) | Engine folder, database, logs, resume, LinkedIn session, and LM Studio checks. |
| `POST /api/run/start` | [app/api/run/start/route.ts](../app/api/run/start/route.ts) | Build engine args and start a run. |
| `POST /api/run/stop` | [app/api/run/stop/route.ts](../app/api/run/stop/route.ts) | Stop the active run and return fresh state. |
| `GET /api/run/current` | [app/api/run/current/route.ts](../app/api/run/current/route.ts) | Return current run plus computed progress. |
| `GET /api/run/[id]/events` | [app/api/run/[id]/events/route.ts](../app/api/run/%5Bid%5D/events/route.ts) | Server-sent events for run lifecycle updates. |

## 🎨 Dashboard Components

| Component | Responsibility |
| --- | --- |
| [src/components/dashboard/page-shell.tsx](../src/components/dashboard/page-shell.tsx) | Outer page layout wrapper. |
| [src/components/dashboard/dashboard-nav.tsx](../src/components/dashboard/dashboard-nav.tsx) | Top navigation. |
| [src/components/dashboard/page-intro.tsx](../src/components/dashboard/page-intro.tsx) | Shared page intro block. |
| [src/components/dashboard/stats-overview.tsx](../src/components/dashboard/stats-overview.tsx) | Summary stat cards. |
| [src/components/dashboard/overview-panel.tsx](../src/components/dashboard/overview-panel.tsx) | Engine root and snapshot context. |
| [src/components/dashboard/overview-links.tsx](../src/components/dashboard/overview-links.tsx) | Quick links into deeper pages. |
| [src/components/dashboard/overview-analytics.tsx](../src/components/dashboard/overview-analytics.tsx) | Visual summary and narrative cues. |
| [src/components/dashboard/search-section.tsx](../src/components/dashboard/search-section.tsx) | Search UI and grouped results. |
| [src/components/dashboard/recommendations-section.tsx](../src/components/dashboard/recommendations-section.tsx) | Recommendation cards and state controls. |
| [src/components/dashboard/run-script-builder.tsx](../src/components/dashboard/run-script-builder.tsx) | Run form, start/stop/refresh controls, live progress, and CLI fallback script output. |
| [src/components/dashboard/reviews-section.tsx](../src/components/dashboard/reviews-section.tsx) | Review history rendering. |
| [src/components/dashboard/decisions-section.tsx](../src/components/dashboard/decisions-section.tsx) | Application decision rendering. |
| [src/components/dashboard/answers-section.tsx](../src/components/dashboard/answers-section.tsx) | Prepared answers and cached answer memory. |
| [src/components/dashboard/artifacts-section.tsx](../src/components/dashboard/artifacts-section.tsx) | Artifact index and detail sections. |
| [src/components/dashboard/firms-section.tsx](../src/components/dashboard/firms-section.tsx) | Company cards and aggregate counts. |
| [src/components/dashboard/logs-section.tsx](../src/components/dashboard/logs-section.tsx) | Recent system logs. |
| [src/components/ui.tsx](../src/components/ui.tsx) | Shared UI primitives. |

## ⚙️ Data And Control Libraries

| File | Responsibility |
| --- | --- |
| [lib/engine-paths.ts](../lib/engine-paths.ts) | Resolve engine paths from `ENGINE_ROOT`. |
| [lib/engine-status.ts](../lib/engine-status.ts) | Read `.env`, check local files, and verify LM Studio reachability. |
| [lib/engine-runner.ts](../lib/engine-runner.ts) | Spawn, track, event, and stop dashboard-started engine runs. |
| [lib/run-progress.ts](../lib/run-progress.ts) | Read fresh DB/log/artifact state for the active run and infer current activity. |
| [lib/run-config.ts](../lib/run-config.ts) | Define run modes, form fields, CLI args, and PowerShell wrapper output. |
| [lib/engine-db.ts](../lib/engine-db.ts) | Read-only SQLite queries for dashboard collections. |
| [lib/engine-artifacts.ts](../lib/engine-artifacts.ts) | Artifact discovery, parsing, previews, and diagnostics shaping. |
| [lib/dashboard-data.ts](../lib/dashboard-data.ts) | Compatibility aggregate reader for overview data. |

## ✅ Tests

| Test | Protects |
| --- | --- |
| [tests/lib/engine-paths.test.ts](../tests/lib/engine-paths.test.ts) | Engine path resolution. |
| [tests/lib/engine-status.test.ts](../tests/lib/engine-status.test.ts) | Config and local readiness checks. |
| [tests/lib/engine-runner.test.ts](../tests/lib/engine-runner.test.ts) | Run spawning and process-tree stop behavior. |
| [tests/lib/run-progress.test.ts](../tests/lib/run-progress.test.ts) | Numeric SQLite timestamps and current activity inference. |
| [tests/lib/run-config.test.ts](../tests/lib/run-config.test.ts) | CLI arg construction and script generation. |
| [tests/lib/engine-db.test.ts](../tests/lib/engine-db.test.ts) | SQLite readers and shaping. |
| [tests/lib/engine-db-search.test.ts](../tests/lib/engine-db-search.test.ts) | Search guards and grouping. |
| [tests/lib/engine-artifacts.test.ts](../tests/lib/engine-artifacts.test.ts) | Artifact parsing, previews, recovery metadata. |
| [tests/lib/dashboard-data.test.ts](../tests/lib/dashboard-data.test.ts) | Aggregate dashboard data. |
| [tests/components/run-script-builder.test.tsx](../tests/components/run-script-builder.test.tsx) | Run screen controls and fallback script rendering. |
| [tests/components/search-section.test.tsx](../tests/components/search-section.test.tsx) | Search section rendering. |
| [tests/components/reviews-section.test.tsx](../tests/components/reviews-section.test.tsx) | Review rendering. |
| [tests/components/decisions-section.test.tsx](../tests/components/decisions-section.test.tsx) | Decision rendering. |
| [tests/components/answers-section.test.tsx](../tests/components/answers-section.test.tsx) | Answer rendering. |
| [tests/components/artifacts-section.test.tsx](../tests/components/artifacts-section.test.tsx) | Artifact UI details. |
| [tests/components/firms-section.test.tsx](../tests/components/firms-section.test.tsx) | Company cards. |
| [tests/components/overview-analytics.test.tsx](../tests/components/overview-analytics.test.tsx) | Overview analytics. |
| [tests/components/dashboard-nav.test.tsx](../tests/components/dashboard-nav.test.tsx) | Navigation links. |

## 📦 Runtime Folders

| Folder | Notes |
| --- | --- |
| `.next/` | Generated Next.js build/dev output. Do not commit. |
| `.runtime/` | Dashboard run event logs. Do not commit. |
| `coverage/` | Test coverage output. Do not commit. |
