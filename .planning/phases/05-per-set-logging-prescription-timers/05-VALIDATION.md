---
phase: 5
slug: per-set-logging-prescription-timers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from 05-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest ^29.7.0 + jest-expo ~55.0.18 (preset `jest-expo`); ts-jest for the `firestore-rules`/node project |
| **Config file** | `jest.config.js` (multi-project: `react-native` + `firestore-rules`) |
| **Quick run command** | `npx jest <path> -x` (e.g. `npx jest src/lib/__tests__/sessionFinalize.test.ts -x`) |
| **Full suite command** | `npx jest --selectProjects react-native` (+ `npx tsc --noEmit`) |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run the single relevant `npx jest <file> -x`.
- **After every plan wave:** Run `npx jest --selectProjects react-native` (full suite green) + `npx tsc --noEmit`.
- **Before `/gsd-verify-work`:** Full suite green; plus on-device timer/alarm manual check after the EAS dev-client rebuild (audio + haptics are not unit-verifiable).
- **Max feedback latency:** ~3 seconds.

---

## Per-Task Verification Map

| Req ID | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|------|----------|-----------|-------------------|-------------|--------|
| LOG-04 / D-08 / HIST-04 | 0 | `completedExerciseIds` = exercises with ≥1 checked set; `totalExercises` correct; unlogged fields → null/false; payload has no `undefined` | unit | `npx jest src/lib/__tests__/sessionFinalize.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| LOG-03 / D-09 | 0 | Prefill: last-session actual wins; trainer-target fallback first session; carry-down within exercise; old sessions (no loggedExercises) don't crash | unit | `npx jest src/lib/__tests__/prefill.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| TIMR-03 | 0 | `remainingMs(endsAt,now)` clamps at 0; `addFifteen` +15s; `isExpired` true at ≤0 | unit | `npx jest src/lib/__tests__/timer.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| TIMR-03 / TIMR-04 | 0 | Fire-once: alarm callback fires exactly once at ≤0; `skip()` suppresses alarm; `add15()` extends; foreground recompute (mock AppState + 3 expo modules) | unit (hook) | `npx jest src/hooks/__tests__/useCountdownTimer.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| PRES-01 | 0 | zod: `repsMin ≤ repsMax`, both ≥1; targetRpe 1–10 (0.5 ok); `timed:true` accepted; rejects min>max | unit | `npx jest src/validation/__tests__/routine.schema.test.ts -x` | ✅ extend | ⬜ pending |
| LOG-04 | 0 | `loggedExercise` validator: accepts null weight/reps/rpe; requires `completed:boolean`; rejects `undefined` | unit | `npx jest src/validation/__tests__/loggedExercise.schema.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| LOG-01 / LOG-02 | 0 | Session store: `setSetValue`/`toggleSet`/`seedExercise` mutate `loggedSets`; `clearSession` resets; partialize includes `loggedSets` | unit | `npx jest src/stores/__tests__/sessionStore.test.ts -x` | ✅ extend | ⬜ pending |
| PRES-01/02/03 (propagation) | 1 | Cloud Function `buildSnapshotExercise` copies repsMin/repsMax/targetRpe/timed (+ alternative branch); missing source defaults safely | unit | `npx jest functions/src/__tests__/createAssignment.test.ts` | ✅ extend | ⬜ pending |
| TIMR-01 / TIMR-02 | 2 | Rest auto-starts on set check; work starts on manual Start | component (optional) | `@testing-library/react-native` render test | ❌ Wave 0 (optional) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/sessionFinalize.ts` + `src/lib/__tests__/sessionFinalize.test.ts` — LOG-04, D-08, HIST-04 invariant
- [ ] `src/lib/prefill.ts` + `src/lib/__tests__/prefill.test.ts` — LOG-03, D-09
- [ ] `src/lib/timer.ts` + `src/lib/__tests__/timer.test.ts` — TIMR-03
- [ ] `src/hooks/useCountdownTimer.ts` + `src/hooks/__tests__/useCountdownTimer.test.ts` — TIMR-03/04 (mock expo-audio/expo-haptics/expo-keep-awake + AppState)
- [ ] `src/validation/loggedExercise.schema.ts` + `src/validation/__tests__/loggedExercise.schema.test.ts` — LOG-04
- [ ] Extend `src/validation/__tests__/routine.schema.test.ts` — PRES-01 (rep range + targetRpe + timed)
- [ ] Extend `src/stores/__tests__/sessionStore.test.ts` — LOG-01/02 (loggedSets actions + partialize)
- [ ] Extend `functions/src/__tests__/createAssignment.test.ts` — PRES propagation through the snapshot builder
- Framework install: none (jest already configured).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Timer alarm sound + vibration at 0 | TIMR-04 | expo-audio playback + expo-haptics need a native dev-client + device speaker/vibrator | After EAS dev-client rebuild: start a rest/work timer, let it reach 0 → confirm alarm sound + vibration fire once |
| Keep-awake while a timer runs | TIMR-03 | OS screen-sleep behavior is device-level | Start a timer, leave the screen idle past the lock timeout → screen stays on while running, releases after stop |
| Per-set logging round-trip on device | LOG-01/02/03 | Real keypad + RPE picker + Firestore write | Log weight/reps/RPE across sets, finish, reopen session detail → values persisted; prefill shows last session next time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
