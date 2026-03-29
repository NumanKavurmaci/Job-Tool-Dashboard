# File Map

## Root

- [package.json](../package.json)
  - dashboard scripts and dependency list
- [README.md](../README.md)
  - user-facing setup and page overview
- [next.config.ts](../next.config.ts)
  - Next.js config
- [tailwind.config.ts](../tailwind.config.ts)
  - Tailwind content scanning and theme wiring
- [vitest.config.ts](../vitest.config.ts)
  - dashboard test runner config

## App Pages

- [app/layout.tsx](../app\layout.tsx)
  - shared page frame and metadata
- [app/page.tsx](../app\page.tsx)
  - overview page; composes general summary sections only
- [app/search/page.tsx](../app\search\page.tsx)
  - collection-wide search page with grouped result sections
- [app/reviews/page.tsx](../app\reviews\page.tsx)
  - dedicated review history page
- [app/decisions/page.tsx](../app\decisions\page.tsx)
  - detailed decision page with query-based filtering
- [app/answers/page.tsx](../app\answers\page.tsx)
  - Easy Apply survey answers and answer memory page
- [app/artifacts/page.tsx](../app\artifacts\page.tsx)
  - artifacts listing page
- [app/companies/page.tsx](../app\companies\page.tsx)
  - firm-level aggregate view

## Dashboard Components

- [src/components/dashboard/page-shell.tsx](../src\components\dashboard\page-shell.tsx)
  - outer page layout wrapper
- [src/components/dashboard/dashboard-nav.tsx](../src\components\dashboard\dashboard-nav.tsx)
  - top navigation across all dashboard pages
- [src/components/dashboard/page-intro.tsx](../src\components\dashboard\page-intro.tsx)
  - shared section/page intro block
- [src/components/dashboard/stats-overview.tsx](../src\components\dashboard\stats-overview.tsx)
  - top-level stats cards
- [src/components/dashboard/overview-panel.tsx](../src\components\dashboard\overview-panel.tsx)
  - engine-root and summary context
- [src/components/dashboard/overview-links.tsx](../src\components\dashboard\overview-links.tsx)
  - quick links from overview into deeper pages
- [src/components/dashboard/search-section.tsx](../src\components\dashboard\search-section.tsx)
  - grouped search results across dashboard collections
- [src/components/dashboard/reviews-section.tsx](../src\components\dashboard\reviews-section.tsx)
  - review history table
- [src/components/dashboard/decisions-section.tsx](../src\components\dashboard\decisions-section.tsx)
  - detailed decision cards with reason chips and links
- [src/components/dashboard/answers-section.tsx](../src\components\dashboard\answers-section.tsx)
  - prepared answer sets and cached answer memory
- [src/components/dashboard/artifacts-section.tsx](../src\components\dashboard\artifacts-section.tsx)
  - artifact rows and previews
- [src/components/dashboard/firms-section.tsx](../src\components\dashboard\firms-section.tsx)
  - company cards with logo, LinkedIn URL, counts, and decision links
- [src/components/dashboard/logs-section.tsx](../src\components\dashboard\logs-section.tsx)
  - recent system logs
- [src/components/ui.tsx](../src\components\ui.tsx)
  - reusable UI primitives such as `Card`, `SectionTitle`, and `Badge`

## Data Readers

- [lib/engine-paths.ts](../lib\engine-paths.ts)
  - resolves engine workspace paths from `ENGINE_ROOT`
- [lib/engine-db.ts](../lib\engine-db.ts)
  - read-only SQLite queries into engine tables, including grouped search helpers
- [lib/engine-artifacts.ts](../lib\engine-artifacts.ts)
  - file-system reads for recent artifacts and previews
- [lib/dashboard-data.ts](../lib\dashboard-data.ts)
  - composition layer that builds one dashboard data object for the pages

## Tests

- [tests/lib/engine-paths.test.ts](../tests\lib\engine-paths.test.ts)
  - validates engine path resolution
- [tests/lib/engine-artifacts.test.ts](../tests\lib\engine-artifacts.test.ts)
  - validates artifact discovery and preview behavior
- [tests/lib/dashboard-data.test.ts](../tests\lib\dashboard-data.test.ts)
  - validates dashboard data aggregation
- [tests/lib/engine-db-search.test.ts](../tests\lib\engine-db-search.test.ts)
  - validates search guard behavior
- [tests/components/answers-section.test.tsx](../tests\components\answers-section.test.tsx)
  - protects answer-page empty and populated renders
- [tests/components/search-section.test.tsx](../tests\components\search-section.test.tsx)
  - protects grouped search rendering and empty-query guidance
- [tests/components/firms-section.test.tsx](../tests\components\firms-section.test.tsx)
  - protects firm cards, LinkedIn URL display, and decision links
- [tests/components/decisions-section.test.tsx](../tests\components\decisions-section.test.tsx)
  - protects detailed decision rendering and empty-state behavior
