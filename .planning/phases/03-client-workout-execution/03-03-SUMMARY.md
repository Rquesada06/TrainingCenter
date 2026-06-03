---
phase: 03-client-workout-execution
plan: "03"
subsystem: client-home-screen
tags: [ui, home-screen, six-states, hydration-gate, stale-date-clear, nativewind, wave-3]
dependency_graph:
  requires: [03-01, 03-02]
  provides:
    - HomeStateCards component family (six named exports)
    - stateful client/index.tsx (six-state derivation, hydration gate, stale-date clear)
  affects: [03-04, 03-05]
tech_stack:
  added: []
  patterns:
    - discriminated-union state derivation — computeTodayWorkout + todaySession null check
    - WORK-09 precedence — active day but session exists → WorkoutDoneCard (1f) trumps ActiveWorkoutCard (1d)
    - hydration gate via persist.onFinishHydration + hasHydrated() — prevents Start/Continue flash
    - stale-date clear on mount (empty-dep useEffect) — drops yesterday's persisted session before resume eval
    - REST_MESSAGES 7-entry tuple keyed by getDay() — deterministic rotation per weekday (D-15)
    - parseDateOnly used in StartsInNCard for toLocaleDateString display (timezone-safe)
    - inline style for dynamic values; NativeWind className for static card layout
key_files:
  created:
    - src/components/workout/HomeStateCards.tsx
  modified:
    - src/app/client/index.tsx
decisions:
  - "Six named components (NoProgramCard, StartsInNCard, RestDayCard, ActiveWorkoutCard, ProgramCompleteCard, WorkoutDoneCard) chosen over a single discriminated-union component — cleaner call sites and no prop-narrowing ceremony for each state"
  - "Route /client/workout/session cast via as any — route is scaffolded in Plan 04; avoids a premature file creation while keeping TypeScript clean for all real routes"
  - "WorkoutDayResult 'active' branch narrowed with Extract<WorkoutDayResult, {state:'active'}> cast — TypeScript cannot narrow after a compound else without explicit help when no_assignment is also in the union"
  - "hasInProgressSession derived as: hydrated && sessionIsActive && sessionDate === today && sessionClientId === uid — all four conditions must hold to avoid false 'Continue' after a cleared session"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-06-03"
  tasks_completed: 2
  files_changed: 2
---

# Phase 03 Plan 03: Client Home — Six States Summary

**One-liner:** Six named HomeStateCard components matching the UI-SPEC Copywriting Contract (Obsidian Performance tokens, 7-entry rotating rest messages, PrimaryButton solid/outline CTAs) plus a stateful client/index.tsx that derives exactly one state via computeTodayWorkout + WORK-09 precedence, guards against Start/Continue flash via persist.onFinishHydration, and clears yesterday's stale session on mount.

---

## What Was Built

### Task 1 — HomeStateCards component family (`src/components/workout/HomeStateCards.tsx`)

Six named React components, all exported from a single file:

- **NoProgramCard** — Ionicons `fitness-outline` 48px #444444, heading "No program yet", body "Your trainer hasn't assigned a program yet. Check back soon." (`border-[#2A2A2A]`, no CTA)
- **StartsInNCard** — Ionicons `calendar-outline` 48px #00FF66, heading conditional (N=1 → "tomorrow"), body "{programName} · First workout on {formatted date}" via `parseDateOnly().toLocaleDateString()` (`border-[#2A2A2A]`, no CTA)
- **RestDayCard** — Ionicons `moon-outline` 48px #888888, heading "Rest day", body from `REST_MESSAGES[parseDateOnly(today).getDay()]` 7-entry tuple (D-15, deterministic by weekday, `border-[#2A2A2A]`, no CTA)
- **ActiveWorkoutCard** — label "Today's Workout", heading {routineName}, body "{N} exercises", PrimaryButton **solid** — label toggles "Start Workout" / "Continue Workout" via `hasInProgressSession` prop (`border-[#444444]`)
- **ProgramCompleteCard** — Ionicons `trophy-outline` 48px #00FF66, heading "Program complete", body "You've finished {programName}. Talk to your trainer about what's next." (`border-[#444444]`, no CTA)
- **WorkoutDoneCard** — Ionicons `checkmark-circle` 48px #00FF66, heading "Workout done!", body "{completedCount} of {total} exercises completed today.", PrimaryButton **outline** — "View session" (`border-[#444444]`)

### Task 2 — Stateful client Home screen (`src/app/client/index.tsx`)

Full rewrite of the placeholder screen:

- Two query hooks: `useClientActiveAssignment()` + `useTodaySession()`
- **Stale-date clear** (D-14 / Pitfall 4): mount effect (empty dep array) checks `sessionDate !== today` and calls `clearSession()` before any resume evaluation
- **Hydration gate**: `useState(false)` + `useEffect` subscribes to `useSessionStore.persist.onFinishHydration`; calls `hasHydrated()` synchronously to handle already-hydrated case; loading spinner renders until `hydrated === true`
- **Loading state**: `ActivityIndicator color="#00FF66" size="large"` centered in `SafeAreaView` while `aLoading || sLoading || !hydrated`
- **Error state**: inline card with `border-[#EF4444]`, copy per UI-SPEC, Retry `Pressable` calls `aRefetch()`
- **State derivation**:
  1. `assignment == null` → NoProgramCard
  2. `computeTodayWorkout(assignment, today).state === 'starts_soon'` → StartsInNCard
  3. `state === 'rest'` → RestDayCard
  4. `state === 'program_complete'` → ProgramCompleteCard
  5. `state === 'active' && todaySession != null` → WorkoutDoneCard (WORK-09 precedence)
  6. `state === 'active' && todaySession == null` → ActiveWorkoutCard
- **in-progress flag**: `hasInProgressSession = hydrated && sessionIsActive && sessionDate === today && sessionClientId === uid`
- CTAs use `router.push('/client/workout/session' as any)` — route scaffolded in Plan 04

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript narrowing on active WorkoutDayResult branch**

- **Found during:** Task 2 TypeScript check
- **Issue:** After the `else` chain, TypeScript's control-flow narrowing left `result` typed as `{ state: 'no_assignment' } | { state: 'active'; ... }` — it couldn't drop `no_assignment` because the preceding `if (!assignment)` branch exits but the outer condition was `assignment` truthy + `state === 'active'`. Accessing `result.day` caused TS2339.
- **Fix:** Added `const activeResult = result as Extract<WorkoutDayResult, { state: 'active' }>` inside the else branch; used `activeResult.day` for routine name/count.
- **Files modified:** `src/app/client/index.tsx`
- **Commit:** 55f6e7b

**2. [Rule 3 - Blocking] Routed /client/workout/session via `as any` cast**

- **Found during:** Task 2 TypeScript check
- **Issue:** expo-router derives its typed `Href` from the file-system. `src/app/client/workout/session.tsx` does not exist until Plan 04. Using the literal string caused TS2345.
- **Fix:** Added `as any` cast with an explanatory comment. This is a forward-reference; the cast will resolve automatically when Plan 04 creates the file.
- **Files modified:** `src/app/client/index.tsx`
- **Commit:** 55f6e7b

---

## Known Stubs

None — all six cards render with real data from the query hooks. The only deferral is `router.push('/client/workout/session')` which will be a live route after Plan 04. The `as any` cast is a type-system stub, not a runtime stub; the navigation call will work as soon as the route file exists.

---

## Threat Surface Scan

This plan renders data from `useClientActiveAssignment` and `useTodaySession`, both already audited in Plans 02 (T-03-07, T-03-08). No new network endpoints, auth paths, or schema changes.

The stale-date clear (T-03-08 mitigation) is implemented: mount effect calls `clearSession()` if `sessionDate !== today`, preventing yesterday's session from surfacing a false "Continue" affordance.

No new threat flags.

---

## Self-Check

Files exist:
- `src/components/workout/HomeStateCards.tsx` ✓
- `src/app/client/index.tsx` ✓ (contains computeTodayWorkout, clearSession, useTodaySession)

Commits exist:
- 48d1b8c — feat(03-03): HomeStateCards — six home-state card components per UI-SPEC
- 55f6e7b — feat(03-03): wire stateful client Home screen with six-state derivation

Tests: 103 passed / 1 skipped — no regressions
TypeScript: 0 errors

## Self-Check: PASSED
