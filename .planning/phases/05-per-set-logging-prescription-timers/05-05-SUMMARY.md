---
phase: 05-per-set-logging-prescription-timers
plan: 05
status: code-complete-pending-human-action
requirements: [TIMR-01, TIMR-02, TIMR-03, TIMR-04]
open_human_action: "Task 4 — EAS dev-client rebuild for expo-audio/expo-haptics/expo-keep-awake (no local Android SDK; build on EAS). On-device alarm/vibration/keep-awake verified in Plan 06 UAT."
---

# Plan 05-05 Summary — Rest + Work Timers

## Status

**Code complete (Tasks 1–3). Task 4 (dev-client rebuild) is a pending human action**, carried into the Plan 06 on-device UAT. The three native modules cannot run in the existing dev client — a rebuild is required before any on-device timer/alarm testing.

> Execution note: Task 3 was interrupted mid-commit by a subagent session limit. The implementation (both components + session.tsx wiring) had been fully written to disk; the orchestrator verified it (RN suite + tsc green) and committed the GREEN step inline, plus added the missing native-module mocks to the Plan-03 `session.wiring.test.ts`.

## What was delivered

### Task 1 — Supply-chain checkpoint (APPROVED)
User confirmed `expo-audio`, `expo-haptics`, `expo-keep-awake` are official Expo first-party packages before install (legitimacy gate, never auto-approved).

### Task 2 — Native install + alarm asset + `useCountdownTimer` hook
- `npx expo install` resolved **SDK-55-compatible** versions (not the npm `latest` 56.x line): `expo-audio ~55.0.14`, `expo-haptics ~55.0.14`, `expo-keep-awake ~55.0.8`.
- `assets/audio/alarm.mp3` bundled (referenced via `require()`).
- `src/hooks/useCountdownTimer.ts` — the single side-effectful timer unit: owns `endsAt`, a 250ms tick (only while active), an `AppState 'active'` foreground recompute (never trusts accumulated ticks, D-06), `expo-keep-awake` activate/deactivate while running, and a `firedRef` fire-once guard that plays the alarm + `Haptics.notificationAsync` exactly once at expiry. `skip()` sets the guard so no alarm. Composes `remainingMs`/`addFifteen`/`isExpired` from the Wave-0 tested `src/lib/timer.ts`.
- Hook test green: **9/9** (alarm fires once, skip suppresses, add15 extends, foreground recompute, keep-awake activate/release).

### Task 3 — Timer components + session.tsx wiring
- `src/components/workout/RestTimerBar.tsx` — pinned inline rest bar (presentational only; `onAdd15`, `accessibilityRole="timer"`; zero `endsAt`/keep-awake logic).
- `src/components/workout/WorkTimerControl.tsx` — timed-exercise manual `Start {duration}s` pill → running row (mm:ss + Skip/+15s) → Done chip (`onStart`).
- `src/app/client/workout/session.tsx` — `restTimer` (auto-start on set check, `restTimer.start(exerciseRestSec)`) + `workTimer` (manual Start, `workTimer.start(exercise.duration)`); `RestTimerBar` mounted above the bottom CTA when running; `WorkTimerControl` rendered in timed-exercise expanded body.

## Key files

| File | Change |
|------|--------|
| `package.json` | + expo-audio ~55.0.14, expo-haptics ~55.0.14, expo-keep-awake ~55.0.8 |
| `assets/audio/alarm.mp3` | new bundled alarm asset |
| `src/hooks/useCountdownTimer.ts` | new — timer hook (endsAt/keep-awake/fire-once alarm+haptic) |
| `src/hooks/__tests__/useCountdownTimer.test.ts` | new — 9 tests |
| `src/components/workout/RestTimerBar.tsx` | new — presentational rest bar |
| `src/components/workout/WorkTimerControl.tsx` | new — manual work-timer control |
| `src/app/client/workout/session.tsx` | timer wiring (rest auto-start + work manual Start) |
| `src/app/client/workout/__tests__/session.wiring.test.ts` | + expo native-module mocks (session now imports the hook) |

## Verification

- `npx jest src/hooks/__tests__/useCountdownTimer.test.ts` — green (9/9)
- `npx jest --selectProjects react-native` — green (284 passed, 1 skipped)
- `npx tsc --noEmit` — clean
- On-device alarm + vibration + keep-awake — **deferred to Plan 06 UAT** (manual-only per 05-VALIDATION.md), requires the dev-client rebuild below.

## Commits

- `852b31f` test(05-05): failing tests for useCountdownTimer hook (RED)
- `c2eca9d` feat(05-05): install native modules + alarm asset + useCountdownTimer hook (GREEN)
- `d126245` test(05-05): failing tests for RestTimerBar + WorkTimerControl (RED)
- `e25614e` feat(05-05): RestTimerBar + WorkTimerControl + session.tsx timer wiring (GREEN)

## ⚠ Open human action — Task 4 (blocking)

**EAS dev-client rebuild** so the three native modules are available on device:
```
eas build --profile development --platform android   # and/or ios
```
Install the new dev client on the test device and confirm it launches without a native-module / TurboModule error. Same path used for expo-video (Phase 3) and expo-image-picker (Phase 4). Resume signal: **"rebuilt"**. This rebuild is the prerequisite for the Plan 06 on-device UAT.
