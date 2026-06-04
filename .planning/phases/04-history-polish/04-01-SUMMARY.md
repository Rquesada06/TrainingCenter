---
phase: 04-history-polish
plan: "01"
subsystem: api
tags: [firebase, firestore, tanstack-query, useInfiniteQuery, adherence, session-history, pure-function]

# Dependency graph
requires:
  - phase: 03-workout-execution
    provides: Session type (assignmentId, completedExerciseIds, weekIndex, dayIndex) + session.service createSession/findTodaySession
  - phase: 02-trainer-content-creation
    provides: Assignment type (startDate, snapshot.weeks[w].days[d].type) + assignment.service callCreateAssignment
  - phase: 01-infrastructure-auth
    provides: Firestore typed collection helpers (assignmentsCollection, sessionsCollection) + RNFB v24 patterns

provides:
  - computeAdherence pure function (HIST-04) — denominator-capped to min(today, programEnd), partial sessions count
  - resolveSessionExercises pure function (HIST-02) — completed/skipped partition from snapshot day
  - fetchSessionPage + fetchSessionsForAssignment + SESSION_PAGE_SIZE in session.service (HIST-01/03)
  - getAssignment(id) single-doc getter in assignment.service (HIST-02)
  - useSessionHistory hook (useInfiniteQuery, cursor pagination) (HIST-01/03)
  - useAssignment hook (useQuery, single-doc) (HIST-02)
  - Wave 0 unit tests for all new logic (35 tests green)

affects:
  - 04-02 (EmptyState + ClientListItem adherence badge — consumes computeAdherence + fetchSessionsForAssignment)
  - 04-04 (history screens — consumes useSessionHistory + useAssignment + resolveSessionExercises)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useInfiniteQuery with Firestore startAfter cursor: initialPageParam=undefined, getNextPageParam via lastDoc, staleTime=60s, gcTime=5min"
    - "Adherence pure function pattern: dayOffset loop 0..capOffset inclusive, ISO string comparison for cap, no toISOString UTC trap"
    - "resolveSessionExercises: Set from completedExerciseIds, partition via has(e.exerciseId)"
    - "RNFB v24 asymmetry: QuerySnapshot.empty is a PROPERTY, DocumentSnapshot.exists() is a METHOD"

key-files:
  created:
    - src/lib/adherence.ts
    - src/lib/sessionDetail.ts
    - src/lib/__tests__/adherence.test.ts
    - src/lib/__tests__/sessionDetail.test.ts
    - src/hooks/useSessionHistory.ts
    - src/hooks/useAssignment.ts
  modified:
    - src/services/session.service.ts
    - src/services/assignment.service.ts
    - src/services/__tests__/session.service.test.ts

key-decisions:
  - "Adherence denominator uses loop offset <= capOffset (inclusive) so day 0 (startDate) is counted — off-by-one guard from RESEARCH.md"
  - "Program-end cap uses ISO string comparison (todayStr < endDateStr) — lexicographically correct for YYYY-MM-DD, avoids UTC parsing"
  - "Session detail exercise resolution: Option A (re-derive from snapshot) — zero schema change, assignment already in TanStack Query cache"
  - "fetchSessionPage lastDoc = undefined when items.length < SESSION_PAGE_SIZE — signals last page to getNextPageParam"
  - "snap.empty accessed as property (RNFB v24); snap.exists() accessed as method (RNFB v24)"

patterns-established:
  - "TDD for pure functions: tests written first (RED), implementation follows (GREEN)"
  - "Session pagination cursor: lastDoc from last page's snap.docs, undefined signals last page"
  - "getAssignment added to assignment.service as first single-doc getter — pattern for future by-ID lookups"

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-04]

# Metrics
duration: 15min
completed: 2026-06-04
---

# Phase 4 Plan 01: History + Adherence Data Layer Summary

**Adherence pure function + paginated session reads + session-detail exercise resolver, with 35 Wave 0 unit tests all green and zero TypeScript errors**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-04T23:08:26Z
- **Completed:** 2026-06-04T23:15:56Z
- **Tasks:** 3 completed
- **Files modified:** 9

## Accomplishments

- `computeAdherence` pure function with correct denominator cap (min today, programEnd), off-by-one guard (day 0 inclusive), and partial-session counting (D-02)
- `fetchSessionPage` + `fetchSessionsForAssignment` in session.service with RNFB v24 cursor pagination and correct `snap.empty` property access
- `resolveSessionExercises` pure function partitioning completed/skipped exercises from assignment snapshot day (Option A — zero schema change)
- `getAssignment(id)` single-doc getter in assignment.service using `snap.exists()` METHOD (RNFB v24)
- `useSessionHistory` infinite query hook with `initialPageParam=undefined`, `getNextPageParam` via lastDoc cursor, `staleTime=60s`, `gcTime=5min`
- `useAssignment` query hook keyed `['assignment', assignmentId]` for session detail exercise name resolution

## Task Commits

1. **Task 1: Wave 0 tests + adherence pure function** - `48d7f0d` (feat)
2. **Task 2: session.service pagination + sessionDetail resolver** - `3dabf82` (feat)
3. **Task 3: useSessionHistory + getAssignment + useAssignment hooks** - `ca369d5` (feat)

## Files Created/Modified

- `src/lib/adherence.ts` — `computeAdherence(assignment, sessions, todayStr)` → integer % or null
- `src/lib/sessionDetail.ts` — `resolveSessionExercises(day, completedExerciseIds)` → {completed, skipped}
- `src/lib/__tests__/adherence.test.ts` — 12 tests: null guards, mid-program, end-cap, off-by-one, partial sessions, RESEARCH.md 50% reference case
- `src/lib/__tests__/sessionDetail.test.ts` — 7 tests: null/undefined/rest day fallback, partition, empty exercises
- `src/services/session.service.ts` — added SESSION_PAGE_SIZE, SessionPage, fetchSessionPage, fetchSessionsForAssignment
- `src/services/__tests__/session.service.test.ts` — extended with 16 new tests covering pagination (cursor/no-cursor, lastDoc, empty snap, mapping)
- `src/services/assignment.service.ts` — added getAssignment(id) with snap.exists() METHOD
- `src/hooks/useSessionHistory.ts` — useInfiniteQuery, cursor pagination, staleTime/gcTime
- `src/hooks/useAssignment.ts` — useQuery, single assignment by ID

## Decisions Made

- **Adherence off-by-one:** Loop uses `offset <= capOffset` (not `< capOffset`) so day 0 and the cap day are both counted. Verified via RESEARCH.md reference case (50% for 1 session / 2 routine days elapsed).
- **Program-end cap:** ISO string comparison `todayStr < endDateStr` (lexicographically correct for YYYY-MM-DD, no UTC parsing needed).
- **Session detail Option A:** Re-derive exercise names from assignment snapshot — zero schema changes, no migration debt on Phase 3 sessions.
- **lastDoc sentinel:** `undefined` when `items.length < SESSION_PAGE_SIZE` — prevents extra empty-page fetch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect test case in adherence.test.ts**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Mid-program test "returns 50% for 1 session out of 2 routine days elapsed" used `today = 2026-06-05` (offset 4 = Fri) with an M/W/F grid. Through offset 4, three routine days are due (offsets 0, 2, 4), not 2 — so the expected 50% was wrong. The function returned 33 (correct: 1/3).
- **Fix:** Changed `today` to `2026-06-04` (offset 3 = Thu) so only offsets 0 and 2 are routine days (denominator = 2) and 1 session = 50%. Test comment updated.
- **Files modified:** `src/lib/__tests__/adherence.test.ts`
- **Verification:** All 12 adherence tests pass green after fix.
- **Committed in:** `48d7f0d` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed lastDoc mock in session.service test**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** The `lastDocMock = { id: 'last-doc' }` object had no `.data()` function. The service calls `d.data()` on all docs when mapping, causing a `TypeError: d.data is not a function` when `lastDocMock` was the last element.
- **Fix:** Added `data: () => ({ clientId: 'client-1', date: '2026-06-20' })` to `lastDocMock` so the mapping doesn't throw.
- **Files modified:** `src/services/__tests__/session.service.test.ts`
- **Verification:** All 23 session.service + sessionDetail tests pass green after fix.
- **Committed in:** `3dabf82` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs in test fixtures)
**Impact on plan:** Both fixes were in test files only (correct assertions that matched wrong fixture values). The implementation was correct in both cases. No scope creep.

## Issues Encountered

None — implementation matched research patterns closely. TypeScript check passed on first attempt.

## User Setup Required

None — no external service configuration required for this plan (pure logic + hooks, no new native modules).

## Next Phase Readiness

- `computeAdherence` ready for `ClientListItem` integration (04-02 EmptyState + adherence badge wave)
- `useSessionHistory` + `useAssignment` + `resolveSessionExercises` ready for history screens (04-04 wave)
- `fetchSessionsForAssignment` ready for per-client adherence queries from trainer's client list
- Wave 0 tests all green (35 tests); TypeScript clean

---
*Phase: 04-history-polish*
*Completed: 2026-06-04*
