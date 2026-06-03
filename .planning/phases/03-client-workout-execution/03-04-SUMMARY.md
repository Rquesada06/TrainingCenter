---
phase: 03-client-workout-execution
plan: "04"
subsystem: client-workout-ui
tags: [workout-execution, session, expo-video, expo-image, zustand, react-query, nativewind]
dependency_graph:
  requires:
    - "03-01 (variantResolver, workoutDayComputer, session types)"
    - "03-02 (sessionStore, useFinishSession, useTodaySession, useClientActiveAssignment, lastWorkoutMode)"
    - "03-03 (HomeStateCards, client/index.tsx)"
  provides:
    - "GymHomeToggle component"
    - "ExerciseRow component (expandable, expo-video/expo-image)"
    - "FinishButton component"
    - "client/workout/_layout.tsx (modal stack)"
    - "client/workout/session.tsx (active + readOnly)"
    - "client/workout/celebration.tsx"
  affects:
    - "client/index.tsx navigation targets (now resolved — session + celebration routes exist)"
    - "Phase 03 Plan 05 (native rebuild enabling expo-video on device)"
tech_stack:
  added: []
  patterns:
    - "useVideoPlayer + VideoView per-row instance (Android constraint — never shared)"
    - "Animated.View FadeIn.duration(200) for expand animation"
    - "useSafeAreaInsets for bottom CTA clearance"
    - "useLocalSearchParams for readOnly param + celebration route params"
    - "router.dismissAll() from celebration to clear workout modal stack"
key_files:
  created:
    - src/components/workout/GymHomeToggle.tsx
    - src/components/workout/ExerciseRow.tsx
    - src/components/workout/FinishButton.tsx
    - src/app/client/workout/_layout.tsx
    - src/app/client/workout/session.tsx
    - src/app/client/workout/celebration.tsx
  modified: []
decisions:
  - "VideoView mounted only when row is expanded — guarantees ≤1 active player at a time; satisfies Android shared-player constraint"
  - "expandedId managed in session screen (parent-controlled single-open) rather than per-row internal state — enables guaranteed collapse-other on open"
  - "session.tsx seedMode from getLastMode() on mount; mode state is local (useState) synced to store (setMode) so FlatList re-renders correctly on toggle"
  - "celebration screen reads params from route, not from sessionStore (which is cleared before navigation) — avoids race condition on clearSession"
  - "router.push celebration path cast as `any` — expo-router typed routes don't include unregistered paths; celebration becomes typed once navigated to"
metrics:
  duration: "~35min"
  completed: "2026-06-03"
  tasks: 3
  files: 6
---

# Phase 03 Plan 04: Workout Execution UI Summary

**One-liner:** Expandable-row workout execution screen with per-row expo-video/expo-image, gym/home variant toggle, crash-safe resume prompt, and celebration modal — composing on Wave 1/2 foundation.

---

## What Was Built

### Task 1: GymHomeToggle + ExerciseRow + FinishButton components (3168122)

**GymHomeToggle** (`src/components/workout/GymHomeToggle.tsx`): Two-segment `[Gym | Home]` control per UI-SPEC New Components. Active segment `bg-[#00FF66]` text `#0E0E0E` font-semibold; inactive transparent with `#888888` text. Labels at 14px. `accessibilityRole="button"` with `accessibilityState.selected` per segment. `hitSlop` for 44pt touch target.

**ExerciseRow** (`src/components/workout/ExerciseRow.tsx`): Expandable exercise row with:
- 24×24 circular checkbox (unchecked `border-[#444444]`, checked `bg-[#00FF66]` + checkmark `#0E0E0E`)
- Exercise name (16px, strikethrough + `#888888` when completed)
- Secondary line: `{sets}×{reps}` or `{sets}×{duration}s` at 14px `#888888`
- Mode tag pill (`gym only`/`home only`, `#FFD600` bg-opacity 20%, rounded-full) when `modeTag !== null` (D-10, 14px — NOT 12px)
- Expand chevron `chevron-down`/`chevron-up`
- Expanded: `Animated.View entering={FadeIn.duration(200)}`; 3-cell detail grid (Sets/Reps|Duration/Rest, `bg-[#0E0E0E]` rounded-lg, label 14px, value 16px/600); notes at 14px when non-null; `InlineVideo` sub-component with its OWN `useVideoPlayer` instance (Android constraint — never shared); expo-image fallback when only `imageUrl`; VideoView only mounted while expanded.

**FinishButton** (`src/components/workout/FinishButton.tsx`): Wraps `PrimaryButton` solid. If `completedCount === totalExercises` → calls `onFinish` directly. Otherwise → `Alert.alert` confirm ("You've completed X of Y exercises. Save anyway?"). `loading={isPending}` `disabled={isPending}` for WORK-06 double-tap guard (T-03-10).

### Task 2: Workout stack layout + session screen (918ffa1)

**_layout.tsx**: `Stack screenOptions={{ headerShown: false }}` with `celebration` declared as `presentation: 'modal'`.

**session.tsx**: Full workout execution screen implementing all critical invariants:
- Header: back arrow (navigation guard), routine name (20px/600), Week/Day subtitle (14px), `GymHomeToggle` flush right
- Mode: seeded from `getLastMode()` on mount; `handleModeChange` calls `setLocalMode` + `setMode` + `setLastMode` (D-09/D-11); `resolveVariant` called per exercise on each render (D-08)
- Single-open expand: parent-controlled `expandedId` state — opening collapses prior row
- Hydration gate: `useSessionStore.persist.onFinishHydration` before showing resume prompt
- Resume prompt (D-14): fires once (guarded by `resumeShownRef`) when `storeIsActive && storeDate === today && storeClientId === uid`; "Start over" clears + restarts; "Resume" keeps restored checks + syncs local mode from store
- Navigation guard (2D): `Alert.alert` on back when `storeIsActive && completedIds.length > 0`; session NOT cleared on back (only on finish/start-over)
- `FinishButton` pinned bottom with `position: absolute`, `paddingBottom: insets.bottom + 16`
- Finish flow: builds `Omit<Session,'id'>` record → `withSaveFeedback(finishMutation.mutateAsync, onSuccess, 'Could not save session')` → `clearSession()` → `router.push celebration`
- readOnly mode: `completedExerciseIds` from `useTodaySession().data` (NOT sessionStore); checkboxes non-interactive; "Close Session" outline button; toggle disabled; header title "Session Complete"

### Task 3: Celebration screen (0043539)

**celebration.tsx**: Modal screen receiving `completed`/`total`/`startedAt`/`completedAt` as route params.
- `ribbon-outline` 64px `#00FF66` icon
- "Workout Complete!" 28px/600/`#FFFFFF`
- Completion count row: `completed` in `#00FF66`, rest in `#FFFFFF` (20px/400)
- Duration line `"Finished in N min"` at 16px/400/`#888888` — hidden when < 1 minute
- Ratio-based closer: 5 options keyed by `completed/total` ratio (1.0 / ≥0.8 / ≥0.5 / ≥0.25 / <0.25)
- "Back to Home": `queryClient.invalidateQueries(['todaySession', uid, today])` then `router.dismissAll()` → Home transitions to State 1f

---

## Verification

- `npx tsc --noEmit` exits 0 (clean)
- `npx jest --selectProjects react-native` — 103 passed, 1 skipped (pre-existing), 0 failures

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. All data flows are wired to live hooks (useClientActiveAssignment, useTodaySession, useFinishSession, useSessionStore). No hardcoded empty values or placeholder copy.

Note: `expo-video` VideoView will produce a JS red-screen on device until the Plan 05 native rebuild. This is expected and documented in the plan — the code is correct; only the native module is not yet built.

---

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced beyond what was planned. Session write flow uses `clientId = uid` (T-03-09 mitigated), FinishButton disables on `isPending` (T-03-10 mitigated).

---

## Self-Check: PASSED

Files verified:
- src/components/workout/GymHomeToggle.tsx — FOUND
- src/components/workout/ExerciseRow.tsx — FOUND
- src/components/workout/FinishButton.tsx — FOUND
- src/app/client/workout/_layout.tsx — FOUND
- src/app/client/workout/session.tsx — FOUND
- src/app/client/workout/celebration.tsx — FOUND

Commits verified:
- 3168122 feat(03-04): GymHomeToggle, ExerciseRow, FinishButton — FOUND
- 918ffa1 feat(03-04): workout stack layout + session screen — FOUND
- 0043539 feat(03-04): celebration/summary screen — FOUND
