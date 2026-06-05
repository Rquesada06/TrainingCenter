# Phase 5: Per-Set Logging, Prescription & Timers - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 19 (8 create, 11 modify)
**Analogs found:** 18 / 19 (1 hook has no direct side-effect analog)

> All file paths below are repo-relative. The executor MUST mirror the cited analogs' conventions: `stripUndefinedDeep` on every Firestore write, `withSaveFeedback` on screen mutations, RNFB v24 `snap.exists()` is a **method**, `null`-not-`undefined` for Firestore-persisted fields, Obsidian palette tokens (`#0E0E0E` base / `#1A1A1A` surface / `#00FF66` accent / `#888888` muted / `#FFD600` warning / `#444444` border), and the five-tier prescription propagation (the Cloud Function snapshot is the easy-to-miss tier).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/sessionFinalize.ts` | utility (pure) | transform | `src/lib/sessionDetail.ts` + `src/lib/adherence.ts` | exact |
| `src/lib/prefill.ts` | utility (pure) | transform | `src/lib/sessionDetail.ts` (`resolveSessionExercises`) | exact |
| `src/lib/timer.ts` | utility (pure) | transform | `src/lib/workoutDayComputer.ts` (pure date math) | exact |
| `src/hooks/useCountdownTimer.ts` | hook (side-effectful) | event-driven | `src/components/workout/ExerciseRow.tsx` `InlineVideo` (closest OS-module side-effect usage); shape from RESEARCH Pattern 1 | partial (no exact analog) |
| `src/validation/loggedExercise.schema.ts` | validator (zod v4) | request-response | `src/validation/routine.schema.ts` | exact |
| `src/components/workout/SetRow.tsx` | component | request-response | `src/components/workout/ExerciseRow.tsx` (expanded detail grid) | role-match |
| `src/components/workout/RpeStepper.tsx` | component | event-driven | `src/components/workout/GymHomeToggle.tsx` (segmented control) | role-match |
| `src/components/workout/RestTimerBar.tsx` | component | event-driven | `src/components/workout/ExerciseRow.tsx` `ModeTagPill` + pinned-bar in `session.tsx` | role-match |
| `src/components/workout/WorkTimerControl.tsx` | component | event-driven | `src/components/workout/FinishButton.tsx` + `PrimaryButton.tsx` | role-match |
| `src/types/session.ts` | model | — | self (additive) | exact |
| `src/types/routine.ts` | model | — | self (additive) | exact |
| `src/stores/sessionStore.ts` | store | event-driven | self (extend `toggleExercise`/`partialize`) | exact |
| `src/app/client/workout/session.tsx` | screen (controller) | request-response | self (extend `handleFinish`/`renderItem`) | exact |
| `src/components/routines/RoutineExerciseRow.tsx` | component | request-response | self (RHF Controller fields) | exact |
| `src/components/routines/RoutineBuilder.tsx` | component | request-response | self (`append` seed defaults) | exact |
| `src/components/routines/ExercisePickerSheet.tsx` | component | request-response | self | exact |
| `src/validation/routine.schema.ts` | validator (zod v4) | request-response | self (add `.refine`) | exact |
| `functions/src/index.ts` (`buildSnapshotExercise`) | service (Cloud Function) | transform | self (5th-tier copy) | exact |
| `firestore.rules` (SESSIONS create) | config (security) | — | self (verify only) | exact |

---

## Shared Patterns

### Pattern S1 — `stripUndefinedDeep` on every Firestore write
**Source:** `src/lib/firestoreWrite.ts` (lines 20-32) — applied in `src/services/session.service.ts` line 174.
**Apply to:** `sessionFinalize.ts` output and the `session.tsx` finalize path. The write already runs through `createSession`:
```typescript
// src/services/session.service.ts:173-176
export async function createSession(data: Omit<Session, 'id'>): Promise<string> {
  const ref = await sessionsCollection().add(stripUndefinedDeep(data) as Session);
  return ref.id;
}
```
**Critical:** `stripUndefinedDeep` DROPS `undefined` keys. `loggedExercises` set fields that are unlogged must be `null`, **never** `undefined`, or the key vanishes and Phase 6 readers break. Coerce to `null` explicitly in `buildFinalizedSession`. The helper recurses into arrays + plain objects (covers `loggedExercises[].sets[]`).

### Pattern S2 — `withSaveFeedback` on screen mutations
**Source:** `src/lib/mutationFeedback.ts` (lines 11-25) — applied in `session.tsx` `handleFinish` (lines 268-284).
**Apply to:** The extended finalize in `session.tsx`. Keep the exact wrapper shape:
```typescript
// src/app/client/workout/session.tsx:268-284
withSaveFeedback(
  () => finishMutation.mutateAsync(sessionRecord),
  () => { clearSession(); router.push({ pathname: '/client/workout/celebration', params: {...} }); },
  'Could not save session'
);
```

### Pattern S3 — `null`-not-`undefined` for Firestore-persisted fields
**Source:** `src/types/session.ts` (lines 6-9, 31) + `src/types/assignment.ts` (lines 10-12). Every snapshot/session field uses `T | null`. New `LoggedSet.{weight,reps,rpe}: number | null`; `targetRpe`/`repsMin`/`repsMax` on the snapshot are `number | null`.

### Pattern S4 — Pure-lib + co-located `__tests__` (Wave-0 test-first)
**Source:** `src/lib/adherence.ts` + `src/lib/__tests__/adherence.test.ts`; `src/lib/sessionDetail.ts` + `__tests__/sessionDetail.test.ts`. Every pure lib has a sibling test in `src/lib/__tests__/*.test.ts`. Doc-comment header cites the requirement IDs (e.g. `adherence.ts` line 1-13). Mirror this for `sessionFinalize.ts`, `prefill.ts`, `timer.ts`.

### Pattern S5 — Five-tier prescription propagation (the integration trap)
A new trainer-set field MUST be added in all five: (1) `src/types/routine.ts` `RoutineExercise`; (2) `src/validation/routine.schema.ts`; (3) `src/components/routines/RoutineExerciseRow.tsx` (RHF Controller); (4) **`functions/src/index.ts` `buildSnapshotExercise` + its `alternativeExercise` branch + the `SnapshotExercise` interface**; (5) `src/types/assignment.ts` `AssignmentSnapshotExercise`. Tier 4 is invisible to a `src/`-only grep — the client renders from the server-built snapshot, not `RoutineExercise`.

### Pattern S6 — Obsidian palette + 8-pt spacing, inline styles or NativeWind
**Source:** `ExerciseRow.tsx` (inline `style` with hex tokens), `GymHomeToggle.tsx`/`TextField.tsx`/`PrimaryButton.tsx` (NativeWind `className` with `[#hex]`). Both styling approaches coexist; match the neighboring file. Accent `#00FF66` reserved for done-check fill, timer progress fill, Start/Finish CTAs, complete left-edge, focused-cell border (per UI-SPEC Color section).

---

## Pattern Assignments

### `src/lib/sessionFinalize.ts` (utility, transform)

**Analog:** `src/lib/sessionDetail.ts` (pure resolver shape) + `src/lib/adherence.ts` (derivation-from-sessions shape).

**Module header + doc convention** (mirror `adherence.ts:1-13` / `sessionDetail.ts:1-11`): cite `LOG-04 / D-07 / D-08 / HIST-04 invariant`, state "No React, no Firebase — pure".

**Imports pattern** (mirror `sessionDetail.ts:13-16`):
```typescript
import type { AssignmentSnapshotExercise } from '@/types/assignment';
import type { LoggedExercise, LoggedSet, Session } from '@/types/session';
```

**Core derivation** (D-08 — the HIST-04 invariant; mirror `sessionDetail.ts:38-63` Set-based partition):
```typescript
export function deriveCompletedExerciseIds(logged: LoggedExercise[]): string[] {
  return logged.filter((ex) => ex.sets.some((s) => s.completed)).map((ex) => ex.exerciseId);
}
```
- `buildFinalizedSession(liveState, resolvedExercises)` returns `Omit<Session,'id'>` with `loggedExercises`, `completedExerciseIds = deriveCompletedExerciseIds(...)`, `totalExercises = resolvedExercises.length`.
- Unlogged set → `{ weight: null, reps: null, rpe: null, completed: false }` (S1/S3 — `null` not `undefined`).
- Null-guard like `sessionDetail.ts:43` (`?? []`) so it never throws on empty.

**Test** (`src/lib/__tests__/sessionFinalize.test.ts`, mirror `adherence.test.ts` structure): ≥1 checked ⇒ id included; 0 checked ⇒ excluded; payload contains no `undefined` (assert via `JSON.stringify` round-trip or explicit key checks); `totalExercises` equals snapshot exercise count.

---

### `src/lib/prefill.ts` (utility, transform)

**Analog:** `src/lib/sessionDetail.ts` `resolveSessionExercises` (pure resolver over snapshot + a session field).

**Core** (last-session actual → trainer-target fallback, D-09):
```typescript
// reads prior Session[] (already fetched via useSessionHistory / fetchSessionsForAssignment)
export function resolvePrefill(
  exercise: AssignmentSnapshotExercise,
  priorSessions: Session[],
): LoggedSet[] { /* per-set seeds */ }
```
- Find the most-recent prior session's `loggedExercises` entry for `exercise.exerciseId`; use its actual `weight`/`reps` per set.
- Fallback on first session (or old v1.0 sessions with no `loggedExercises`): seed from snapshot target — `repsMin` (or legacy `reps`), `weight: null`. Null-guard missing `loggedExercises` (returns target, no crash) exactly like `sessionDetail.ts:42-43`.
- Carry-down within an exercise (D-02): set N+1 seeds from set N's edited values — a pure helper over the seed array.

**Test** (`src/lib/__tests__/prefill.test.ts`): last-session-wins; target fallback; carry-down; old-session (no `loggedExercises`) safe.

---

### `src/lib/timer.ts` (utility, transform)

**Analog:** `src/lib/workoutDayComputer.ts` (pure date/number math, no React/Firebase).

**Core** (absolute-`endsAt` math, D-06 — never accumulate ticks):
```typescript
export const remainingMs = (endsAt: number, now: number): number => Math.max(0, endsAt - now);
export const addFifteen = (endsAt: number): number => endsAt + 15_000;
export const isExpired = (endsAt: number, now: number): boolean => endsAt - now <= 0;
```
Mirror `workoutDayComputer.ts` style: small named exports, doc-comment header citing `TIMR-03`, `Math.floor`/`Math.max` clamps. Add `formatMmSs(ms)` if the bar/control needs it (pure).

**Test** (`src/lib/__tests__/timer.test.ts`, mirror `workoutDayComputer.test.ts`): `remainingMs(now+5000, now)===5000`; clamps negative to 0; `addFifteen`; `isExpired` boundary at exactly 0.

---

### `src/hooks/useCountdownTimer.ts` (hook, event-driven) — NO exact analog

**Closest partial analogs:** `ExerciseRow.tsx` `InlineVideo` (lines 48-63 — the only existing OS-module-owning unit, one instance per consumer) and the hydration-effect / `AppState`-style subscribe-cleanup pattern in `session.tsx` (lines 113-121). Use the **RESEARCH Pattern 1 shape** (RESEARCH.md lines 144-187) as the authoritative skeleton — it is the verified design.

**Conventions to replicate:**
- Subscribe-then-cleanup effect with `return () => sub.remove()` (mirror `session.tsx:114-121`).
- Derive `remainingMs` from `endsAt - now` only (D-06); `firedRef` guard fires alarm exactly once; `skip()` sets the guard so no alarm.
- Own the three native modules here so they are swappable: `expo-keep-awake` (`activateKeepAwakeAsync`/`deactivateKeepAwake`), `expo-audio` (alarm — **`[ASSUMED]` API, verify against installed `node_modules/expo-audio` post-install**), `expo-haptics` (`Haptics.notificationAsync`).
- Two consumers (rest auto-start, work manual Start) differ only in who calls `start(seconds)`.

**Test** (`src/hooks/__tests__/useCountdownTimer.test.ts`): fake timers; alarm fires once at expiry; `skip()` suppresses; `add15()` extends; mock all three expo modules (mirror the `jest.mock(...)` before-imports pattern in `sessionStore.test.ts:20-24`).

---

### `src/validation/loggedExercise.schema.ts` (validator, zod v4)

**Analog:** `src/validation/routine.schema.ts` (zod v4 API).

**Imports + shape** (mirror `routine.schema.ts:9-21`):
```typescript
import { z } from 'zod';

export const loggedSetSchema = z.object({
  setNumber: z.coerce.number().int().positive(),
  weight: z.coerce.number().nonnegative().nullable(),   // null = unlogged, NOT optional/undefined
  reps: z.coerce.number().int().nonnegative().nullable(),
  rpe: z.coerce.number().min(1).max(10).nullable(),
  completed: z.boolean(),                                 // always present
});
```
**Critical (Pitfall 5):** use `.nullable()` (yields `null`), NOT `.optional()` (yields `undefined` → stripped by S1). Use zod v4 API only: `z.coerce.number()`, `z.enum([...] as const)`, `z.url()`.

**Test** (`src/validation/__tests__/loggedExercise.schema.test.ts`, mirror `routine.schema.test.ts`): accepts `null` weight/reps/rpe; requires `completed:boolean`; rejects `undefined`.

---

### `src/components/workout/SetRow.tsx` (component, request-response)

**Analog:** `ExerciseRow.tsx` expanded detail grid (lines 198-253 — the `flexDirection:'row', gap:8` cell layout) and its checkbox (lines 136-160).

**Props** (per UI-SPEC New Components § SetRow): `setNumber, weight, reps, rpe, completed, isPrefilled, onChangeWeight, onChangeReps, onChangeRpe, onToggleDone, readOnly?`.

**Cell layout** — reuse the grid weights from UI-SPEC A2 (`SET 0.9 / PESO 2.6 / REPS 2.0 / RPE 2.2 / STATUS 1.6`, `gap:8`). Mirror `ExerciseRow.tsx:199-253` cell style (`bg #0E0E0E`, `borderRadius:8`, `padding:8`).

**Done-check** — copy the checkbox from `ExerciseRow.tsx:144-159` but 28×28 (vs 24), `#00FF66` fill, Ionicons `checkmark` 16px `#0E0E0E`, `hitSlop` to 44pt:
```typescript
// adapt from ExerciseRow.tsx:144-159
<View style={{ width: 28, height: 28, borderRadius: 14,
  borderWidth: completed ? 0 : 2, borderColor: '#444444',
  backgroundColor: completed ? '#00FF66' : 'transparent', ... }}>
  {completed && <Ionicons name="checkmark" size={16} color="#0E0E0E" />}
</View>
```
**Value color rule (UI-SPEC):** `#888888` when `isPrefilled && !completed && !edited`; `#FFFFFF` otherwise. Numeric cells use mono family, `keyboardType="number-pad"`, focused-cell `border #00FF66`. **Drop strikethrough** — the v1.0 `textDecorationLine: 'line-through'` (`ExerciseRow.tsx:170`) is removed; use the accent left-edge complete treatment on the card instead.

---

### `src/components/workout/RpeStepper.tsx` (component, event-driven)

**Analog:** `GymHomeToggle.tsx` (compact segmented control with `hitSlop`, accessibility) for chrome; `ExerciseRow.tsx` for `#444444` borders.

**Shape** (UI-SPEC): `[ − ] {value} [ + ]` + "Clear". Buttons 32×32 `border border-[#444444] rounded-lg`, Ionicons `remove`/`add` 16px `#FFFFFF`, value mono 16/600 `#FFFFFF`. Clamp 1.0–10.0, step 0.5 (integer fallback acceptable per D-03). Accessibility: `accessibilityRole="adjustable"`, `accessibilityValue={{ now: rpe }}`. NOT a free keypad (D-01).

---

### `src/components/workout/RestTimerBar.tsx` (component, event-driven)

**Analog:** the pinned bottom-CTA container in `session.tsx` (lines 399-411 — `position:'absolute', bottom:0`, `borderTopColor:'#2A2A2A'`, `insets.bottom` padding) for the pinned bar; `ExerciseRow.tsx` `ModeTagPill` (lines 73-90) for the `#FFD600` warning treatment.

**Props** (UI-SPEC § RestTimerBar): `remainingMs, totalMs, onSkip, onAdd15`. Container `bg-[#0E0E0E]`, `border-t border-[#2A2A2A]`, 56px + `insets.bottom`, sits ABOVE the finish container. Countdown Display 28/600 mono `#FFFFFF`; flips to `#FFD600` in final 10s. `Skip`/`+15s` are outline pills (`border #444444`), no accent, ≥44pt. **Timer arithmetic (endsAt/keep-awake/alarm) lives in `useCountdownTimer`, NOT here** — this is a presentational component.

**Integration into `session.tsx`:** when visible, increase the FlatList `contentContainerStyle.paddingBottom` by 56 (the existing pattern at `session.tsx:392-394` already computes a conditional bottom pad — extend that expression).

---

### `src/components/workout/WorkTimerControl.tsx` (component, event-driven)

**Analog:** `FinishButton.tsx` + `PrimaryButton.tsx` (the accent solid pill) for the idle Start; the running row reuses the RestTimerBar countdown/controls treatment.

**Props** (UI-SPEC § WorkTimerControl): `durationSec, state: 'idle'|'running'|'done', remainingMs, onStart, onSkip, onAdd15`. Idle = accent pill `bg-[#00FF66]` `#0E0E0E` label `Start {duration}s` + Ionicons `play`. Done = `#00FF66` "Done" chip. Manual start only (D-05).

---

### `src/types/session.ts` (model — MODIFY, additive)

**Analog:** self. Add ABOVE `Session` (mirror the existing `null`-not-`undefined` doc-comment at lines 6-9):
```typescript
export interface LoggedSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}
export interface LoggedExercise {
  exerciseId: string;
  name: string;
  timed: boolean;
  sets: LoggedSet[];
}
```
Add to `Session` (line 32 area): `loggedExercises?: LoggedExercise[];` — optional for v1.0 back-compat (every reader null-guards). Keep `completedExerciseIds`/`totalExercises` (still derived on finalize).

---

### `src/types/routine.ts` (model — MODIFY, additive)

**Analog:** self. Extend `RoutineExercise` (lines 13-24), keeping legacy `reps?` for back-compat:
```typescript
repsMin?: number;
repsMax?: number;
targetRpe?: number;   // 1–10, 0.5 step
timed?: boolean;      // missing ⇒ weighted (NEVER infer from field presence — D-11)
```

---

### `src/stores/sessionStore.ts` (store — MODIFY)

**Analog:** self — extend `toggleExercise` (lines 101-107), `INITIAL` (lines 73-83), `partialize` (lines 117-127).

**Add to `LocalSessionState`** + `INITIAL`:
```typescript
loggedSets: Record<string /*exerciseId*/, LoggedSet[]>;   // INITIAL: {}
```
**Add actions** (mirror the immutable-update style of `toggleExercise:101-107`):
```typescript
setSetValue: (exerciseId, setNumber, field: 'weight'|'reps'|'rpe', value: number|null) => void;
toggleSet:   (exerciseId, setNumber) => void;       // flips completed; carries values down to N+1
seedExercise:(exerciseId, seeds: LoggedSet[]) => void;  // from prefill resolver on first expand
```
**Add `loggedSets` to `partialize`** (line 117-127 block) so it's crash-safe. `clearSession` already `set(INITIAL)` → resets it automatically (rollover + finish). Hydration: missing key in a pre-Phase-5 blob hydrates to `INITIAL.loggedSets = {}` — verify it is not left `undefined`.

**Test** (extend `sessionStore.test.ts`): `setSetValue`/`toggleSet`/`seedExercise` mutate `loggedSets`; `clearSession` empties it; partialize includes it. Mirror the `setState(INITIAL)` `beforeEach` reset (lines 36-39).

---

### `src/app/client/workout/session.tsx` (screen — MODIFY)

**Analog:** self — extend `renderItem` (lines 368-391) and `handleFinish` (lines 245-303).

**Finalize:** replace the inline `sessionRecord` build (lines 253-266) with a call to `buildFinalizedSession(...)` from `sessionFinalize.ts`, then keep the existing `withSaveFeedback` wrapper (S2, lines 268-284) unchanged. The new payload extends `Session` with `loggedExercises`; `completedExerciseIds`/`totalExercises` now come from the pure derivation.

**Render:** the per-exercise `ExerciseRow` checkbox path stays for the collapsed card; the expanded body renders `SetRow ×N` (weighted) or `WorkTimerControl` (timed). Inline `RestTimerBar` mounts above the bottom CTA (lines 398-427) when a rest timer is active; extend the conditional `paddingBottom` (lines 392-394).

---

### `src/components/routines/RoutineExerciseRow.tsx` (component — MODIFY)

**Analog:** self — the RHF `Controller` + `TextField` pattern (lines 75-137).

**Add fields** following the exact Controller shape at lines 90-104 (`name={`exercises.${index}.repsMin`}` etc.):
- `repsMin` + `repsMax` (two numeric fields, en-dash separator, label "Reps (min–max)").
- `targetRpe` (optional numeric, "Target RPE").
- `timed` toggle (inline labeled switch — TimedToggle; reuse `GymHomeToggle.tsx` visual language, `bg-[#444444]` off / `bg-[#00FF66]` on, `accessibilityRole="switch"`).
- When `timed` ON: show `Duration (s)`, hide `Reps (min–max)`/`Target RPE`/`Rest (s)` (D-11). Hidden fields RETAIN their RHF values (don't clear) so toggling is reversible.

Numeric Controller convention to copy verbatim (lines 78-86): `value={String(field.value ?? '')}`, `onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}`, `keyboardType="number-pad"`, `error={fieldState.error?.message}`.

---

### `src/components/routines/RoutineBuilder.tsx` + `ExercisePickerSheet.tsx` (MODIFY)

**Analog:** self — `RoutineBuilder.tsx` `handleExercisesSelected` `append({...})` seed (lines 90-107). Add the new fields to the seed object (seed `repsMin`/`repsMax` from `ex.defaultReps`, `timed: false`, `targetRpe: undefined`). `ExercisePickerSheet.tsx` only needs touching if the seed defaults flow through it (verify — the append happens in `RoutineBuilder`).

---

### `src/validation/routine.schema.ts` (validator — MODIFY)

**Analog:** self (lines 11-21). Add to `routineExerciseSchema` then attach a `.refine` (per RESEARCH lines 286-295):
```typescript
repsMin: z.coerce.number().int().positive().optional(),
repsMax: z.coerce.number().int().positive().optional(),
targetRpe: z.coerce.number().min(1).max(10).optional(),
timed: z.boolean().optional(),
// ...then on the object:
.refine(d => d.repsMin == null || d.repsMax == null || d.repsMin <= d.repsMax,
        { message: 'Min must be ≤ max', path: ['repsMax'] })
```
**Test** (extend `routine.schema.test.ts`, lines 21-57): `{repsMin:10,repsMax:8}` fails with "Min must be ≤ max"; valid range passes; targetRpe out of 1–10 fails; `timed:true` accepted.

---

### `functions/src/index.ts` → `buildSnapshotExercise` (service — MODIFY, TIER 4)

**Analog:** self — the `buildSnapshotExercise` body (lines 290-326) and the `SnapshotExercise` interface (lines 160-173).

**Add to the `SnapshotExercise` interface** (lines 160-173): `repsMin: number | null; repsMax: number | null; targetRpe: number | null; timed: boolean;`.

**Copy into the MAIN return** (lines 297-325, mirror the `reps`/`duration` coalescing at lines 301-302):
```typescript
repsMin: (routineEx.repsMin as number | undefined) ?? null,
repsMax: (routineEx.repsMax as number | undefined) ?? null,
targetRpe: (routineEx.targetRpe as number | undefined) ?? null,
timed: (routineEx.timed as boolean | undefined) ?? false,
```
**Copy into the `alternativeExercise` branch too** (lines 310-323) — alternatives default the same way (`timed: false`, others `null`). **Then mirror the same fields in `src/types/assignment.ts` `AssignmentSnapshotExercise`** (lines 25-38) — tier 5.

**Test** (extend `functions/src/__tests__/createAssignment.test.ts`): the snapshot payload's exercise carries `repsMin/repsMax/targetRpe/timed`; alt branch too; missing source fields default safely (`timed⇒false`). Assert via the existing `setPayload.snapshot...` pattern (lines 227-236).

**Ops (RESEARCH Runtime Inventory):** redeploy functions; if redeploy returns 403, re-run `scripts/grant-invoker.mjs` (project memory). Existing snapshots are immutable — new assignments only.

---

### `firestore.rules` — SESSIONS create (config — VERIFY)

**Analog:** self (lines 138-143). The current rule is field-shape-agnostic:
```
match /sessions/{sessionId} {
  allow create, update: if isClient() && request.resource.data.clientId == request.auth.uid;
  ...
}
```
**Action:** verify the SESSIONS create still permits the new `loggedExercises` shape (it does — no per-field allowlist) while keeping ownership (`clientId == request.auth.uid`). The single-create-on-finish path preserves immutability (D-12). No change expected; the file is modified in git status — confirm current state before relying. Optionally add numeric bounds if feasible (RESEARCH Security V5), but ownership + single-write is the load-bearing control.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/useCountdownTimer.ts` | hook | event-driven | No existing hook owns OS side-effects (audio/haptics/keep-awake) + `AppState`. Closest is `ExerciseRow.tsx` `InlineVideo` (per-consumer OS instance) and the `session.tsx` subscribe/cleanup effect. Use RESEARCH Pattern 1 (lines 144-187) as the authoritative skeleton; mark the `expo-audio` play call `[ASSUMED]` until verified against the installed package. |

---

## Metadata

**Analog search scope:** `src/lib`, `src/lib/__tests__`, `src/hooks`, `src/validation`, `src/validation/__tests__`, `src/stores`, `src/stores/__tests__`, `src/components/{workout,routines,ui}`, `src/types`, `src/app/client/workout`, `src/services`, `functions/src`, `functions/src/__tests__`, `firestore.rules`.
**Files scanned:** ~30 read in full or targeted.
**Pattern extraction date:** 2026-06-05
