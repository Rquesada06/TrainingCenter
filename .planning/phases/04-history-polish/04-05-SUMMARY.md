---
phase: 04-history-polish
plan: 05
subsystem: ui
tags: [react-query, adherence, empty-state, trainer-lists, expo-router, ionicons]

# Dependency graph
requires:
  - phase: 04-history-polish (04-01)
    provides: adherence.ts (computeAdherence), session.service.ts (fetchSessionsForAssignment)
  - phase: 04-history-polish (04-03)
    provides: AdherenceBadge.tsx, EmptyState.tsx components
provides:
  - HIST-04 adherence % rendered on each trainer client card (threshold-colored)
  - Actionable EmptyState on all four trainer lists (clients, exercises, routines, programs)
  - Filter-active message-only EmptyState on the exercises list (no misleading CTA)
affects: [04-07, trainer-dashboard, history-polish-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy per-row useQuery for derived data (adherence sessions) gated by enabled flag"
    - "useMemo for adherence computation (never compute in render body)"
    - "Two-branch ListEmptyComponent: actionable EmptyState (no data) vs message-only EmptyState (filter active)"

key-files:
  created: []
  modified:
    - src/components/clients/ClientListItem.tsx
    - src/app/trainer/clients/index.tsx
    - src/app/trainer/exercises/index.tsx
    - src/app/trainer/routines/index.tsx
    - src/app/trainer/programs/index.tsx

key-decisions:
  - "Adherence badge renders nothing (not a spinner) until resolved — avoids per-row layout shift (UI-SPEC § 5)"
  - "Exercises filter-active empty branch kept as message-only EmptyState with no CTA — Add would be misleading while filtering"

patterns-established:
  - "Per-client derived-data fetch: useQuery keyed on [name, client.uid, assignment.id], enabled only when assignment exists (RESEARCH Open Q2 — MVP ~5 clients)"
  - "EmptyState CTA route reuses the screen's existing header + button onPress route"

requirements-completed: [HIST-04, HIST-01]

# Metrics
duration: ~12min
completed: 2026-06-04
---

# Phase 04 Plan 05: Adherence on Client Cards + EmptyState on Trainer Lists Summary

**Per-client adherence % wired onto trainer client cards via lazy useQuery + computeAdherence, and every trainer list (clients, exercises, routines, programs) now renders the reusable actionable EmptyState with the correct CTA route.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-04T23:27Z
- **Completed:** 2026-06-04T23:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- HIST-04: each `ClientListItem` fetches its current-program sessions lazily and shows the threshold-colored adherence % below the program label (nothing when not computable).
- Success criterion 5 (actionable half): all four trainer lists replaced inline empty Text with the reusable `EmptyState` + correct CTA routes.
- Exercises list preserves its filter-active branch as a message-only `EmptyState` ("No matches", search-outline, no CTA), replacing only the no-data branch with the actionable "+ Add Exercise" state.

## Task Commits

Each task was committed atomically:

1. **Task 1: Adherence on ClientListItem (HIST-04)** - `ac9e7bf` (feat)
2. **Task 2: EmptyState on all four trainer lists** - `16bc410` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/clients/ClientListItem.tsx` - Added lazy per-client sessions useQuery, useMemo adherence computation, and AdherenceBadge render below program label.
- `src/app/trainer/clients/index.tsx` - EmptyState (people-outline, "+ Add Client" → /trainer/clients/add).
- `src/app/trainer/exercises/index.tsx` - Two-branch EmptyState: no-data (barbell-outline, "+ Add Exercise" → /trainer/exercises/new) vs filter-active (search-outline, "No matches", no CTA).
- `src/app/trainer/routines/index.tsx` - EmptyState (list-outline, "+ New Routine" → /trainer/routines/new).
- `src/app/trainer/programs/index.tsx` - EmptyState (calendar-outline, "+ New Program" → /trainer/programs/new).

## Decisions Made
- Adherence slot renders `null` until resolved rather than a per-row spinner, per UI-SPEC § 5 (avoid layout shift across the list).
- Exercises filter-active empty state intentionally omits the Add CTA — showing it while a filter narrows results would be misleading (plan Task 2 CRITICAL note).
- CTA routes were taken directly from each screen's existing header "+" button onPress (clients → /add, others → /new), matching the plan's reuse instruction.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- During Task 2 verification, one transient `tsc` run reported a `TS2345` typed-route error in `src/app/client/history/index.tsx` — an **untracked** file owned by a parallel Wave 2 plan (04-04), outside this plan's file set. On the next `tsc` run (after expo-router regenerated its typed-route declarations) the error cleared and full `tsc --noEmit` returned exit 0. Per SCOPE BOUNDARY, no fix was applied; logged to `deferred-items.md` for 04-04's awareness.

## User Setup Required
None - no external service configuration required.

## Threat Surface
No new security surface beyond the plan's threat_model. The per-client `fetchSessionsForAssignment` query filters by `clientId == client.uid` AND `assignmentId` (T-04-09 mitigation honored — query is identical to the Wave 1 service). N+1 per-row queries (T-04-10) accepted for MVP (~5 clients).

## Known Stubs
None - both features wire real data (computeAdherence over fetched sessions; EmptyState driven by live list emptiness).

## Next Phase Readiness
- Trainer dashboard now surfaces adherence and consistent empty states; ready for 04-07 device verification of the trainer side.
- Verifier should regenerate `.expo/types` if the 04-04 history typed-route error resurfaces (see deferred-items.md).

## Self-Check: PASSED

---
*Phase: 04-history-polish*
*Completed: 2026-06-04*
