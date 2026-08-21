# Concurrent run architecture

The dashboard admits at most two active engine processes. It uses a fail-fast registry rather than a queue so the operator always knows whether a requested run actually started.

## Invariants

- `running` and `stopping` both consume a slot. A slot is released only after the child process reaches a terminal state.
- Every child receives a dashboard-generated `JOB_TOOL_RUN_ID`.
- Reviews, structured logs, and run-report artifacts are filtered by that run ID. Time ranges are only an additional boundary, not the primary correlation key.
- A LinkedIn browser profile and a Kariyer browser profile are exclusive resources. Two runs may coexist when their exclusive resource sets do not intersect.
- Execution mode (`live`, `dry-run`, or `non-submit`) is derived once from the actual engine arguments and stored on the run record. UI form changes cannot relabel an existing run.
- Stop is run-ID scoped. A stop request changes the run to `stopping`; `stopped` is emitted only after child exit is observed.
- Each run keeps a bounded in-memory event tail and an append-only JSONL event file. SSE uses monotonic sequence IDs and supports replay through `Last-Event-ID`.

## Control flow

1. The start API validates the request and readiness checks.
2. The registry synchronously checks the two-slot capacity and exclusive resource claims.
3. It reserves the run ID, starts the child, and passes `JOB_TOOL_RUN_ID` in the environment.
4. The engine attaches the ID to Pino output, `JobReviewHistory.detailsJson`, durable `SystemLog.detailsJson`, and run-report filenames/payloads.
5. Dashboard progress queries use the run ID plus `startedAt`/`finishedAt`, preventing overlapping runs from sharing reviews, activity, or artifacts.
6. Run-specific SSE channels update the corresponding UI card. Terminal events close their stream.

## API contract

- `GET /api/run/current` returns the legacy `run` alias plus `runs`, `activeCount`, `maxActive`, and `available`.
- `POST /api/run/start` starts one run or returns `RUN_CAPACITY_FULL` / `RUN_RESOURCE_CONFLICT` with HTTP 409.
- `POST /api/run/:id/stop` targets exactly one run.
- `POST /api/run/stop` remains compatible; without a run ID it returns `RUN_ID_REQUIRED` when two runs are active.
- `GET /api/run/:id/events` rejects unknown IDs, replays the bounded event tail, then follows live events.

## Resource matrix

| Pair | Result |
| --- | --- |
| LinkedIn + LinkedIn | Rejected: shared LinkedIn profile |
| Kariyer + Kariyer | Rejected: shared Kariyer profile |
| LinkedIn + Kariyer | Allowed |
| LinkedIn/Kariyer + generic external | Allowed |
| Two generic external or non-browser utilities | Allowed, subject to the two-slot cap |

## Process lifetime

The registry is versioned on `globalThis`, so Next.js development hot reloads preserve active child handles. A full dashboard process restart cannot reattach to an existing child's stdio; operators should stop active runs before restarting the dashboard. Durable supervisor/reconciliation is intentionally a separate future layer rather than pretending an orphaned process is controllable.

Runs that were already active before this architecture was loaded are migrated as `legacy-time`: they retain their child handle and time-based progress instead of incorrectly showing an empty run-ID-filtered view. Every newly started run uses strict `run-id` correlation.
