---
phase: 3
slug: client-workout-execution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-03
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 03-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (react-native project) |
| **Config file** | `jest.config.js` — `projects[0]` (react-native preset) |
| **Quick run command** | `npx jest --testPathPattern="workoutDayComputer\|variantResolver\|session\|sessionStore" --passWithNoTests` |
| **Full suite command** | `npx jest --selectProjects react-native` |
| **Estimated runtime** | ~3 seconds (react-native project) |

---

## Sampling Rate

- **After every task commit:** Run the quick command above.
- **After every plan wave:** Run the full react-native suite.
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** ~5 seconds.

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| WORK-01 | `computeTodayWorkout` returns correct state for all cases (no-program / future / rest / active / complete) | unit | `npx jest workoutDayComputer` | ❌ Wave 0 | ⬜ pending |
| WORK-01 | `localTodayString` returns LOCAL date (not UTC `toISOString`) | unit | `npx jest workoutDayComputer` | ❌ Wave 0 | ⬜ pending |
| WORK-02 | Home renders correct one of 4 states + program-complete + completed-today | component | manual verify | n/a | ⬜ pending |
| WORK-03 | Exercise detail expands with sets/reps/duration/rest/notes + video/image | component | manual verify | n/a | ⬜ pending |
| WORK-04 | Mark-complete toggles per-exercise completion | component | manual verify | n/a | ⬜ pending |
| WORK-05 | `resolveVariant` returns correct exercise + mode tag (gym/home/both/no-alt) | unit | `npx jest variantResolver` | ❌ Wave 0 | ⬜ pending |
| WORK-06/07 | Finish (confirm-if-incomplete) saves session + shows celebration | unit (mock firestore) + manual | `npx jest session.service` | ❌ Wave 0 | ⬜ pending |
| WORK-08 | sessionStore persists/restores; clears stale (yesterday) date on open | unit (mock AsyncStorage) | `npx jest sessionStore` | ❌ Wave 0 | ⬜ pending |
| WORK-09 | `findTodaySession` returns null when none, doc when exists (duplicate guard) | unit (mock firestore) | `npx jest session.service` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/workoutDayComputer.test.ts` — date-only offset + 6 state cases (WORK-01)
- [ ] `src/lib/__tests__/variantResolver.test.ts` — gym/home/both/no-alt resolution (WORK-05)
- [ ] `src/services/__tests__/session.service.test.ts` — findTodaySession + createSession (WORK-06/07/09)
- [ ] `src/stores/__tests__/sessionStore.test.ts` — persist/restore + stale-date clear (WORK-08)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Home shows correct live state | WORK-01/02 | Depends on a real assignment + device clock | Assign a program to the test client; open client app; verify the home state matches today's snapshot day |
| Exercise detail + video playback | WORK-03 | expo-video needs a native dev build | Expand an exercise with a videoUrl; confirm inline playback |
| Gym/home toggle swaps variants | WORK-05 | Visual swap | Toggle mode; confirm alternative exercises swap and "gym only/home only" tags show |
| Crash-safe resume | WORK-08 | Requires force-killing the app mid-session | Check a few exercises, force-quit, reopen → "Resume / Start over" prompt restores checks + mode |
| Finish + celebration + duplicate guard | WORK-06/07/09 | End-to-end device flow | Finish a session → celebration + Firestore `sessions` doc; reopen → completed state, no new session |
