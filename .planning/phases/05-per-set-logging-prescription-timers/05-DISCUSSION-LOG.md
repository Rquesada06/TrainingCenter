# Phase 5: Per-Set Logging, Prescription & Timers — Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 5-per-set-logging-prescription-timers
**Areas discussed:** Set-row logging UX, Timer trigger & controls, Finishing partial/blank sets, Trainer prescription shape

---

## Set-row logging UX

| Option | Selected |
|--------|----------|
| Keypad fields (weight/reps) + RPE 1–10 picker | ✓ |
| +/− steppers for everything | |
| Keypad for all three (RPE typed) | |

**Choice:** Numeric keypad for weight/reps, compact 1–10 picker for RPE (half-steps allowed). With prefill, an unchanged set is just the done-check.

## Timer trigger & controls

| Option | Selected |
|--------|----------|
| Auto-start rest on set-done, inline bottom bar (Skip / +15s) | ✓ |
| Manual "Rest" button | |
| Auto-start, full-screen overlay | |

**Choice:** Rest timer auto-starts when a set is checked, inline bar with Skip + +15s; work timer is a Start button on timed exercises. Foreground keep-awake, absolute endsAt, alarm + vibration at 0.

## Finishing partial/blank sets

| Option | Selected |
|--------|----------|
| Allow anytime, save nulls (exercise complete if ≥1 set checked) | ✓ |
| Warn then allow | |
| Require all sets resolved | |

**Choice:** Finish anytime; unlogged sets save null/unchecked; exercise counts complete if ≥1 set checked (preserves partial-adherence + completedExerciseIds back-compat).

## Trainer prescription — rep target

| Option | Selected |
|--------|----------|
| Rep range (min–max) | ✓ |
| Single rep target | |

**Choice:** Rep range (e.g. 8–10), per the mockup — small schema addition.

## Trainer prescription — timed exercise marking

| Option | Selected |
|--------|----------|
| Explicit "timed" toggle | ✓ |
| Infer from duration field | |

**Choice:** Explicit toggle. Timed → duration field + work timer (no weight/reps rows); weighted → sets × rep-range + rest timer.

## Prefill source

| Option | Selected |
|--------|----------|
| Last session wins (fall back to trainer target) | ✓ |
| Trainer target always | |

**Choice:** Last session's actual prefills; first session falls back to the trainer target. Supports progressive overload.

## Claude's Discretion
- Exact schema field names (loggedExercises, repsMin/repsMax, targetRpe, timed flag); how completedExerciseIds is derived on finalize; RPE picker widget + half-step support; inline timer-bar visual design (→ /gsd-ui-phase 5); session-store live shape + persist discipline.

## Deferred Ideas
- Background timer alarm → v2 TIMR-05; kg/lb toggle → v2 TIMR-06; push/pull/legs grouping → v2 INST-03; Insights/PRs/charts + coach visibility → Phase 6. (Settled at the milestone boundary, not scope-creep.)
