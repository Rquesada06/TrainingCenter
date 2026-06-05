# Phase 5: Per-Set Logging, Prescription & Timers - Research

**Researched:** 2026-06-05
**Domain:** React Native (Expo SDK 55) per-set logging UI, trainer prescription schema, foreground countdown timers with alarm/haptics, crash-safe Zustand state, single-write finalize
**Confidence:** HIGH (stack settled in CLAUDE.md/SUMMARY.md; integration grounded in actual code)

## Summary

This phase converts the existing "mark exercise complete" workout flow into per-set logging with trainer-prescribed targets and foreground rest/work timers. The library stack is already decided and non-negotiable (`expo-audio` + `expo-haptics` + `expo-keep-awake`, all installed via `npx expo install`; `expo-av` is removed in SDK 55). The research effort therefore concentrates on **integration mechanics into the existing code** and the **Validation Architecture** (Nyquist is enabled).

The single most important integration discovery: **the client workout screen renders from the immutable `AssignmentSnapshotExercise`, not from `RoutineExercise` directly, and that snapshot is built server-side by the `createAssignment` Cloud Function (`functions/src/index.ts` → `buildSnapshotExercise`).** Any new prescription field (`repsMin`/`repsMax`/`targetRpe`/timed flag) must therefore flow through **five tiers** to reach the client: (1) `RoutineExercise` type, (2) `routine.schema.ts` zod, (3) builder UI, (4) the Cloud Function snapshot builder, (5) `AssignmentSnapshotExercise` type. Omitting tier 4 is the trap that makes the trainer-set fields silently invisible to clients with existing assignments and to all new assignments.

The second pillar is the four pure, Wave-0-testable units the planner must build test-first: (a) finalize derivation of `completedExerciseIds`/`totalExercises` from `loggedExercises`; (b) the prefill resolver (last-session actual → trainer-target fallback); (c) timer countdown math from an absolute `endsAt`; (d) the zod v4 validators for `loggedExercises` and the new prescription fields. All four are framework-free pure functions and mirror the established `src/lib/*` + `src/lib/__tests__/*` pattern.

**Primary recommendation:** Extract all logic into pure functions in `src/lib/` (`sessionFinalize.ts`, `prefill.ts`, `timer.ts`) and a single timer hook `src/hooks/useCountdownTimer.ts`; keep the Firestore write single-shot on finalize via the existing `stripUndefinedDeep` + `withSaveFeedback` path; propagate the schema through all five tiers including the Cloud Function.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-set live logging state (weight/reps/rpe/done) | Client (Zustand + AsyncStorage) | — | D-LOG-04/D-12: crash-safe live state, single Firestore write on finalize only |
| Finalize derivation (`completedExerciseIds`, `loggedExercises`) | Client (pure lib) | API/Firestore (persist) | Pure transform of live state → Session record; written once |
| Prefill resolution (last-session → target fallback) | Client (pure lib) | API/Firestore (read history) | Reads session history via existing query; resolution is pure |
| Timer countdown (remaining from `endsAt`) | Client (pure lib + hook) | OS (keep-awake, audio, haptics) | Foreground-only; never trust ticks; OS modules fire alarm |
| Trainer prescription capture (rep range, RPE, timed, rest, duration) | Client builder (RHF + zod) | — | Form state; validated client-side |
| Prescription → client propagation | **API (Cloud Function snapshot)** | Client types | Snapshot is built server-side; **must copy new fields or they never reach the client** |
| Adherence / StatusBadge (HIST-04) | Client (existing pure lib) | — | Unchanged; still reads `completedExerciseIds` which finalize keeps populated |

## Standard Stack

> Library choices are **settled** in `CLAUDE.md` and `.planning/research/SUMMARY.md`. Do NOT re-derive them. This table records the verified versions only.

### Core (new this phase)
| Library | Version (npm latest) | Install | Purpose | Why Standard |
|---------|---------|---------|---------|--------------|
| expo-audio | resolved by `npx expo install` (SDK-55 pin; npm latest 56.0.11) | `npx expo install expo-audio` | Alarm sound at countdown 0 (TIMR-04) | Official replacement for the **removed** expo-av in SDK 55 [CITED: CLAUDE.md Gotcha 8 / SUMMARY.md] |
| expo-haptics | resolved by `npx expo install` (npm latest 56.0.3) | `npx expo install expo-haptics` | Vibration at countdown 0 (TIMR-04) | Official Expo module, cross-platform [CITED: SUMMARY.md] |
| expo-keep-awake | resolved by `npx expo install` (npm latest 56.0.3) | `npx expo install expo-keep-awake` | Keep screen on while a timer runs (TIMR-03) | Official Expo module; JS timers suspend when screen locks [CITED: SUMMARY.md] |

> **Version note:** npm `latest` for all three is the **SDK 56** line (published 2026-06-01). The project is on **Expo SDK 55** (`expo@55.0.26`). **Always install with `npx expo install`, never `npm install`** — `expo install` resolves the SDK-55-compatible version from Expo's compatibility table. Installing the npm `latest` (56.x) directly would pull a version built for RN 0.84+/SDK 56 and likely break the New-Architecture dev-client build. [VERIFIED: npm registry — versions/dates confirmed via `npm view`; SDK pin authority is Expo docs/`npx expo install`]

### Already installed (reuse, do not add)
| Library | Installed Version | Use This Phase |
|---------|---------|----------------|
| zod | ^4.4.3 | New validators (`loggedSet`, rep-range refinement) — use v4 API (`z.coerce.number()`, `z.enum([...] as const)`) |
| react-hook-form | (per CLAUDE.md) | Builder Controllers for new prescription fields |
| react-native-reanimated | 4.2.1 | Optional timer progress-bar animation (executor's choice; a 250ms `setInterval` is sufficient) |
| jest + jest-expo | jest ^29.7.0 / jest-expo ~55.0.18 | Wave-0 unit tests |
| @testing-library/react-native | ^13.3.3 | Component/hook tests if needed |
| @react-native-async-storage/async-storage | (installed) | Already backs `sessionStore` persist |

### Alternatives Considered (already rejected in SUMMARY.md — do not revisit)
| Instead of | Rejected Alternative | Why rejected |
|------------|-----------|----------|
| expo-audio | expo-av | Removed in SDK 55 |
| numeric rest field | react-native-timer-picker | Trainer enters plain seconds; numeric field suffices |
| foreground keep-awake | expo-notifications background alarm | v2 TIMR-05; foreground covers the in-gym case |

**Installation:**
```bash
npx expo install expo-audio expo-haptics expo-keep-awake
# then a dev-client rebuild (EAS — no local Android SDK). See "Native Rebuild" below.
```

## Package Legitimacy Audit

> slopcheck was **not available** in this research session (`pip install slopcheck` failed, command not found). Per protocol, packages are tagged `[ASSUMED]` and the planner SHOULD gate the install behind a `checkpoint:human-verify` task. Mitigating factor: all three are **first-party Expo-maintained** packages (org `expo`, in the Expo SDK), which materially lowers supply-chain risk versus a third-party package.

| Package | Registry | Age / latest publish | Source Repo | slopcheck | Disposition |
|---------|----------|------|-------------|-----------|-------------|
| expo-audio | npm | 56.0.11, 2026-06-01 | github.com/expo/expo (monorepo) | unavailable → `[ASSUMED]` | Approved (Expo first-party); install via `npx expo install` |
| expo-haptics | npm | 56.0.3, 2026-06-01 | github.com/expo/expo (monorepo) | unavailable → `[ASSUMED]` | Approved (Expo first-party) |
| expo-keep-awake | npm | 56.0.3, 2026-06-01 | github.com/expo/expo (monorepo) | unavailable → `[ASSUMED]` | Approved (Expo first-party) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Planner action:** add ONE `checkpoint:human-verify` before the `npx expo install` task (verify these are the official `expo` org packages and the resolved SDK-55 versions). This satisfies SUMMARY.md pitfall #6 (supply-chain checkpoint) even though those three are first-party (the convention applies to all native adds).

## Architecture Patterns

### System Architecture Diagram

```
TRAINER PRESCRIPTION FLOW (write path — new fields must traverse ALL of this)
  RoutineBuilder (RHF form)
    │  repsMin/repsMax, targetRpe, timed toggle, rest, duration
    ▼
  routine.schema.ts (zod v4 validate: repsMin ≤ repsMax, RPE 1–10)
    ▼
  routine.service.ts → ROUTINES doc (stripUndefinedDeep)
    ▼
  createAssignment Cloud Function  ── buildSnapshotExercise() ──┐   ◄── MUST copy new fields here
    ▼                                                            │
  ASSIGNMENTS.snapshot.weeks[].days[].routine.exercises[]  (AssignmentSnapshotExercise)
    │
    ▼
CLIENT EXECUTION FLOW (read + log path)
  session.tsx ── computeTodayWorkout() → AssignmentSnapshotExercise[]
    │
    ├─► resolveVariant(ex, mode)  → which exercise (gym/home)
    │
    ├─► prefill resolver (lib/prefill.ts): last session actuals → snapshot target fallback
    │       reads history via fetchSessionsForAssignment / useSessionHistory
    │
    ├─► SetRow ×N  (weight/reps keypad, RpeStepper, done-check)
    │       └─ on change/toggle → sessionStore.setSetValue / toggleSet  (live, crash-safe)
    │
    ├─► done-check ──► useCountdownTimer (rest, auto-start from ex.rest)
    │   WorkTimerControl ──► useCountdownTimer (work, manual Start from ex.duration)
    │       endsAt = now + sec*1000 ; remaining = endsAt - now (recompute on foreground)
    │       keep-awake while active ; at ≤0 → expo-audio + expo-haptics fire ONCE
    │
    ▼
  Finish (anytime, D-07)
    │  buildFinalizedSession(liveState, snapshot)  ── lib/sessionFinalize.ts (PURE) ──┐
    │      → loggedExercises[] (nulls for unlogged)                                    │
    │      → completedExerciseIds = exercises with ≥1 checked set (D-08)  ◄── HIST-04 / StatusBadge depend on this
    ▼
  useFinishSession → createSession → stripUndefinedDeep → SESSIONS doc (SINGLE WRITE, D-12/D-13)
    ▼  withSaveFeedback → clearSession() → celebration
```

### Recommended additions to structure
```
src/lib/
├── sessionFinalize.ts   # PURE: live state → { loggedExercises, completedExerciseIds, totalExercises }
├── prefill.ts           # PURE: resolvePrefill(snapshotExercise, priorSessions) → per-set seeds
├── timer.ts             # PURE: remainingMs(endsAt, now), addFifteen(endsAt), isExpired(...)
src/hooks/
└── useCountdownTimer.ts # owns endsAt + 250ms tick + foreground recompute + keep-awake + alarm/haptic
src/components/workout/
├── SetRow.tsx           # per UI-SPEC
├── RpeStepper.tsx
├── RestTimerBar.tsx
└── WorkTimerControl.tsx
src/validation/
└── loggedExercise.schema.ts  # zod v4 (optional — finalize input guard)
```

### Pattern 1: Single timer hook, two consumers (D-04/D-05/D-06)
**What:** One `useCountdownTimer` owns `endsAt`, the tick, keep-awake, and the fire-once alarm. Rest (auto-start) and work (manual Start) differ only in *who calls `start(seconds)`*.
**When to use:** Both the rest bar and the work control.
**Example (shape — verify expo-audio API against installed version's docs before coding):**
```typescript
// Source: pattern synthesized from SUMMARY.md reliability rules + Expo module conventions [ASSUMED — verify API post-install]
function useCountdownTimer(onExpire?: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  // tick only while active
  useEffect(() => {
    if (endsAt == null) return;
    activateKeepAwakeAsync('timer');                 // expo-keep-awake
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => { clearInterval(id); deactivateKeepAwake('timer'); };
  }, [endsAt]);

  // recompute on foreground — never trust accumulated ticks (D-06)
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  const remainingMs = endsAt == null ? 0 : Math.max(0, endsAt - now);

  // fire ONCE at <= 0
  useEffect(() => {
    if (endsAt != null && remainingMs <= 0 && !firedRef.current) {
      firedRef.current = true;
      // play expo-audio alarm asset + Haptics.notificationAsync(Success)
      onExpire?.();
      setEndsAt(null);
    }
  }, [remainingMs, endsAt]);

  return {
    remainingMs,
    isRunning: endsAt != null,
    start: (sec: number) => { firedRef.current = false; setEndsAt(Date.now() + sec * 1000); setNow(Date.now()); },
    add15: () => setEndsAt(e => (e == null ? e : e + 15_000)),
    skip:  () => { firedRef.current = true; setEndsAt(null); },  // dismiss, NO alarm
  };
}
```
> **expo-audio caveat:** the SDK-55 expo-audio API uses a player/hook model that changed across versions. Do NOT hardcode an API from memory — read the installed package's docs (or `node_modules/expo-audio`) after install. Mark the alarm-play call `[ASSUMED]` until verified. Cleanup (release the player) on unmount.

### Pattern 2: Pure finalize derivation (D-07/D-08, HIST-04 invariant)
**What:** `buildFinalizedSession` takes live per-set state + the snapshot and returns the exact `Omit<Session,'id'>` payload. `completedExerciseIds` = every exercise with **≥1 set `completed === true`** (weighted) or a started-and-finished work timer (timed). Unlogged sets serialize as `weight/reps/rpe: null, completed: false`.
**Why pure:** Keeps the existing single-write finalize (`session.tsx` `handleFinish`) thin and makes the HIST-04/StatusBadge contract unit-testable. `adherence.ts` and `StatusBadge` read `completedExerciseIds` unchanged.

### Pattern 3: Five-tier schema propagation (the integration trap)
**What:** New prescription fields must be added in this order: `RoutineExercise` (type) → `routine.schema.ts` (zod) → `RoutineExerciseRow.tsx` + `RoutineBuilder.tsx` (UI) → **`functions/src/index.ts` `buildSnapshotExercise` (server copy)** → `AssignmentSnapshotExercise` (type). The Cloud Function tier is the one a grep of `src/` will miss.
**When to use:** Every new trainer-prescribed field.

### Anti-Patterns to Avoid
- **Per-set Firestore writes:** Violates D-12/D-13 single-write invariant; live state belongs in Zustand+AsyncStorage. Write once on finalize.
- **Counting ticks for remaining time:** Backgrounding pauses JS timers → drift. Always `endsAt - now`.
- **Adding new fields only to `src/` types:** They never reach the client because the snapshot is server-built. Update the Cloud Function.
- **Whole-exercise strikethrough:** Per UI-SPEC, dropped — sets are individually logged; use the accent left-edge complete treatment.
- **`undefined` in the finalize payload:** Firestore drops undefined and `stripUndefinedDeep` removes keys. Use `null` for unlogged values so the field persists (Phase 6 readers expect the key present).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keep screen on during timer | Custom native module / wake lock | `expo-keep-awake` | Official, handles iOS+Android |
| Alarm sound | Bundled WebAudio / expo-av | `expo-audio` | expo-av removed SDK 55; audio is native |
| Vibration | `Vibration` API guesswork per-platform | `expo-haptics` | Unified iOS haptics + Android vibrator |
| undefined-stripping on write | New helper | `stripUndefinedDeep` | Already the project convention |
| Save error UX | Inline try/catch + custom alert | `withSaveFeedback` | Established mutation feedback wrapper |
| Date/rollover math | New date utils | `localTodayString` / `parseDateOnly` (workoutDayComputer) | UTC-drift-safe, already tested |
| Crash-safe live state | New persistence | Extend `sessionStore` (persist + partialize) | The crash-safe pattern already exists |

**Key insight:** Almost every primitive this phase needs already exists in `src/lib`/`src/stores`. The net-new code is three small pure libs, one hook, four components, and the schema propagation — not infrastructure.

## Runtime State Inventory

> This is an additive feature phase, not a rename/migration. Included for completeness because it touches persisted Zustand state and existing Firestore documents.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (Firestore) | Existing `SESSIONS` docs (v1.0) have **no** `loggedExercises`; existing `ASSIGNMENTS` snapshots have **no** `repsMin/repsMax/targetRpe/timed` | **No migration.** New fields optional; readers null-guard. Old assignments render with `reps` legacy + no RPE/timed (back-compat). |
| Stored data (AsyncStorage) | `sessionStore` persisted under key `laufit:session` with current partialize shape | Adding new persisted fields is forward-compatible (missing keys hydrate as their initial value). Verify hydration defaults the new per-set map to `{}`. |
| Live service config | None | None — verified by reading the code paths. |
| OS-registered state | None | None — timers are in-process; no Task Scheduler / notifications (background is v2). |
| Secrets / env vars | None | None. |
| Build artifacts / native | `expo-audio`/`expo-haptics`/`expo-keep-awake` are **native modules → require a dev-client rebuild** | EAS dev-client rebuild (no local Android SDK). Same as expo-image-picker in v1.0. |
| Server code | `createAssignment` Cloud Function snapshot builder | Update `buildSnapshotExercise` to copy new fields; **redeploy functions**; re-run `scripts/grant-invoker.mjs` if functions redeploy returns 403 (per project memory). New assignments only — existing snapshots are immutable by design. |

## Common Pitfalls

### Pitfall 1: New prescription fields invisible on the client
**What goes wrong:** Trainer sets a rep range / timed toggle, but the client screen shows nothing new.
**Why it happens:** The client reads `AssignmentSnapshotExercise` built by the Cloud Function, not `RoutineExercise`. The new fields aren't copied in `buildSnapshotExercise`.
**How to avoid:** Add fields to `buildSnapshotExercise` (and its alternative-exercise branch), update `SnapshotExercise` interface in `functions/src/index.ts` and `AssignmentSnapshotExercise` in `src/types/assignment.ts`, redeploy functions.
**Warning signs:** Builder shows the field; a freshly assigned program's client view doesn't.

### Pitfall 2: Existing v1.0 assignments lack the new fields
**What goes wrong:** A client on a program assigned in v1.0 crashes or shows blanks.
**Why it happens:** Immutable snapshots from before this phase have `reps: number|null` only, no `repsMin/repsMax/targetRpe/timed`.
**How to avoid:** Client render must null-guard: fall back to legacy `reps` for the rep display, treat missing `timed` as `false`, missing `targetRpe` as "no RPE target". The `timed` decision must be inferable-safe: `timed === true` only when explicitly set; everything else weighted.
**Warning signs:** `undefined` rep range in a card; a weighted exercise rendering as timed.

### Pitfall 3: Timer drift / double-fire on background
**What goes wrong:** Alarm fires twice, or shows wrong remaining time after foregrounding.
**Why it happens:** Counting ticks instead of `endsAt`; no fire-once guard.
**How to avoid:** `remaining = max(0, endsAt - Date.now())`; recompute `now` on `AppState 'active'`; a `firedRef` guard so the alarm fires exactly once; `skip` sets the guard so no alarm.
**Warning signs:** Alarm after Skip; remaining jumps.

### Pitfall 4: `completedExerciseIds` regression breaks adherence/StatusBadge
**What goes wrong:** HIST-04 adherence and StatusBadge change behavior.
**Why it happens:** Finalize stops populating `completedExerciseIds`, or the "≥1 set checked" rule is implemented differently from the old "exercise checked" rule.
**How to avoid:** Keep `completedExerciseIds` populated by `buildFinalizedSession`; D-08 (≥1 set checked ⇒ complete) preserves the partial-counts adherence rule. Unit-test the derivation against the old semantics.
**Warning signs:** A logged session shows 0% adherence; StatusBadge says "not started" after logging.

### Pitfall 5: zod v4 / undefined-vs-null mismatch
**What goes wrong:** Firestore write fails ("Unsupported field value: undefined") or a blank RPE drops the key.
**Why it happens:** zod `.optional()` yields `undefined`; `stripUndefinedDeep` removes it; but `loggedExercises` set fields should persist as `null`.
**How to avoid:** In the finalize builder, coerce unlogged values to `null` explicitly (not via optional). Use zod v4 API throughout (`z.coerce.number()`, `z.enum([...] as const)`, `z.url()` — never v3 forms). Rep-range refinement: `.refine(d => d.repsMin <= d.repsMax, 'Min must be ≤ max')`.
**Warning signs:** Save error alert on finish; missing `rpe` key in Phase 6 reads.

### Pitfall 6: AssignmentSnapshotExercise `exists()` method gotcha (project memory)
**What goes wrong:** Reads that null-check a snapshot use `!snap.exists` (always false).
**Why it happens:** RNFB v24 `DocumentSnapshot.exists` is a **method**, not a property.
**How to avoid:** Use `snap.exists()`. (Relevant if any new history read is added for prefill.)

## Code Examples

### Pure finalize derivation (Wave-0 testable)
```typescript
// Source: synthesized from existing src/lib/sessionDetail.ts + session.tsx handleFinish [ASSUMED shape]
export interface LoggedSet { setNumber: number; weight: number | null; reps: number | null; rpe: number | null; completed: boolean; }
export interface LoggedExercise { exerciseId: string; name: string; timed: boolean; sets: LoggedSet[]; }

export function deriveCompletedExerciseIds(logged: LoggedExercise[]): string[] {
  return logged.filter(ex => ex.sets.some(s => s.completed)).map(ex => ex.exerciseId);
}
```

### zod v4 prescription + logged-set validators
```typescript
// Source: extends src/validation/routine.schema.ts (zod v4) [VERIFIED: zod ^4.4.3 installed]
export const routineExerciseSchema = z.object({
  // ...existing...
  repsMin: z.coerce.number().int().positive().optional(),
  repsMax: z.coerce.number().int().positive().optional(),
  targetRpe: z.coerce.number().min(1).max(10).optional(),
  timed: z.boolean().optional(),         // missing ⇒ weighted (back-compat)
}).refine(
  d => d.repsMin == null || d.repsMax == null || d.repsMin <= d.repsMax,
  { message: 'Min must be ≤ max', path: ['repsMax'] },
);
```

### Timer math (pure)
```typescript
// Source: SUMMARY.md reliability rules
export const remainingMs = (endsAt: number, now: number) => Math.max(0, endsAt - now);
export const addFifteen = (endsAt: number) => endsAt + 15_000;
export const isExpired = (endsAt: number, now: number) => endsAt - now <= 0;
```

## Session Store Extension (D-LOG-04)

Add a live per-set map to `LocalSessionState` + actions. Keep partialize discipline (persist data only) and `clearSession` resets it (covers rollover + finish).

```typescript
// shape addition to src/stores/sessionStore.ts
loggedSets: Record<string /*exerciseId*/, LoggedSet[]>;   // INITIAL: {}
// actions:
setSetValue: (exerciseId, setNumber, field: 'weight'|'reps'|'rpe', value: number|null) => void;
toggleSet:   (exerciseId, setNumber) => void;   // flips completed; carries values down to setNumber+1 prefill
seedExercise:(exerciseId, seeds: LoggedSet[]) => void;   // from prefill resolver on first expand
```
- Add `loggedSets` to `INITIAL` (`{}`) and to `partialize` so it's crash-safe.
- `clearSession` already `set(INITIAL)` → resets `loggedSets` automatically (rollover + finish covered).
- Hydration: missing key in a pre-Phase-5 persisted blob hydrates to `INITIAL.loggedSets = {}` — forward-compatible. Verify the hydration merge does not leave it `undefined`.
- Keep `completedExerciseIds` in the store **or** derive it at finalize from `loggedSets` (recommended: derive at finalize via `deriveCompletedExerciseIds`, and keep the store action `toggleExercise` only if any v1.0 path still uses it — otherwise the per-set flow supersedes per-exercise toggling).

## Schema Migration Shape

| Field | Location | Type | Back-compat |
|-------|----------|------|-------------|
| `repsMin`, `repsMax` | `RoutineExercise`, snapshot, schema | `number?` | Keep legacy `reps?` for old data; new builder writes range. Display: prefer range, fall back to `reps`. |
| `targetRpe` | same | `number?` (1–10, 0.5 step) | Missing ⇒ no RPE target shown |
| `timed` | same | `boolean?` | Missing ⇒ `false` (weighted). **Never infer from field presence** (D-11). |
| `loggedExercises` | `Session` | `LoggedExercise[]?` | Missing on all v1.0 sessions; every reader null-guards (Phase 6 + session detail) |
| `LoggedSet.{weight,reps,rpe}` | within | `number | null` | `null` for unlogged — **not** undefined (stripUndefinedDeep) |
| `LoggedSet.completed` | within | `boolean` | always present |

**Cloud Function:** mirror these in `SnapshotExercise` (functions/src/index.ts) + `buildSnapshotExercise` (both main and alternative branches). Redeploy + re-grant invoker if 403.

## Native Rebuild + Supply-Chain

1. `npx expo install expo-audio expo-haptics expo-keep-awake` (SDK-55 pins).
2. **Supply-chain checkpoint** (`checkpoint:human-verify`): confirm all three are the official `expo` org packages and the resolved versions match the SDK-55 compatibility table (slopcheck unavailable this session → manual verification).
3. Add a short bundled alarm audio asset (e.g. `assets/audio/alarm.mp3`); reference via `require()`.
4. **Dev-client rebuild via EAS** (no local Android SDK — project memory). Native modules don't work in Expo Go and aren't picked up by JS-only OTA. This is a hard checkpoint before on-device timer testing.
5. iOS: expo-audio may need an audio-session/`infoPlist` consideration for playing while the ringer is silent — verify against installed docs; not a blocker for the foreground in-gym case.

## Validation Architecture

> Nyquist validation is **enabled** (`workflow.nyquist_validation: true`). This section generates VALIDATION.md.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | jest ^29.7.0 + jest-expo ~55.0.18 (preset `jest-expo`), ts-jest for node project |
| Config file | `jest.config.js` (multi-project: `react-native` + `firestore-rules`) |
| Quick run command | `npx jest <path> -x` (e.g. `npx jest src/lib/__tests__/sessionFinalize.test.ts -x`) |
| Full suite command | `npx jest` |
| Pattern | Pure libs in `src/lib/*` with co-located `src/lib/__tests__/*.test.ts`; stores mock AsyncStorage; zod in `src/validation/__tests__/*` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOG-04 / D-08 | `completedExerciseIds` = exercises with ≥1 checked set; `totalExercises` correct; unlogged → null/false | unit | `npx jest src/lib/__tests__/sessionFinalize.test.ts -x` | ❌ Wave 0 |
| LOG-03 / D-09 | Prefill: last-session actual wins; trainer-target fallback on first session; carry-down within exercise | unit | `npx jest src/lib/__tests__/prefill.test.ts -x` | ❌ Wave 0 |
| TIMR-03 | `remainingMs(endsAt,now)` clamps at 0; `addFifteen` +15s; `isExpired` true at ≤0 | unit | `npx jest src/lib/__tests__/timer.test.ts -x` | ❌ Wave 0 |
| TIMR-04 | Fire-once guard: alarm fires exactly once at ≤0; Skip suppresses alarm (hook test) | unit (hook) | `npx jest src/hooks/__tests__/useCountdownTimer.test.ts -x` | ❌ Wave 0 |
| PRES-01 | zod: `repsMin ≤ repsMax`, both ≥1; targetRpe 1–10 (0.5 ok); rejects min>max | unit | `npx jest src/validation/__tests__/routine.schema.test.ts -x` | ✅ extend existing |
| LOG-04 | `loggedExercises` validator: null for unlogged, completed boolean required | unit | `npx jest src/validation/__tests__/loggedExercise.schema.test.ts -x` | ❌ Wave 0 |
| LOG-01/02 | Session store: setSetValue / toggleSet / seedExercise mutate live state; clearSession resets `loggedSets` | unit | `npx jest src/stores/__tests__/sessionStore.test.ts -x` | ✅ extend existing |
| PRES-01/02/03 (propagation) | Cloud Function `buildSnapshotExercise` copies repsMin/repsMax/targetRpe/timed (+ alt branch) | unit | `npx jest functions/src/__tests__/createAssignment.test.ts` (or node project) | ✅ extend existing |
| TIMR-01/02 | Rest auto-starts on set check; work starts on manual Start (component) | component | `@testing-library/react-native` render test (optional) | ❌ Wave 0 (optional) |

### What each Wave-0 file asserts
- **`sessionFinalize.test.ts`** — `deriveCompletedExerciseIds`: ≥1 checked ⇒ included; 0 checked ⇒ excluded; timed exercise complete when its implicit set completed. `buildFinalizedSession`: produces `loggedExercises` with `null` for unlogged weight/reps/rpe, `completed:false`; `totalExercises === snapshot.exercises.length`; payload contains no `undefined`.
- **`prefill.test.ts`** — given prior sessions, returns last session's actual weight/reps per set; falls back to snapshot target (`repsMin`/legacy `reps`) when no prior session; within an exercise, set N+1 seeds from set N's edited values; handles missing `loggedExercises` on old sessions (returns target fallback, no crash).
- **`timer.test.ts`** — `remainingMs(now+5000, now)===5000`; clamps negative to 0; `addFifteen`; `isExpired` boundary at exactly 0.
- **`useCountdownTimer.test.ts`** — with fake timers: alarm callback fires exactly once at expiry; `skip()` before expiry fires no callback; `add15()` extends; foreground recompute path (mock AppState). Mock expo-audio/expo-haptics/expo-keep-awake.
- **`routine.schema.test.ts` (extend)** — rep-range refine: `{repsMin:10,repsMax:8}` fails with "Min must be ≤ max"; valid range passes; targetRpe out of 1–10 fails; `timed:true` accepted.
- **`loggedExercise.schema.test.ts`** — accepts `null` weight/reps/rpe; requires `completed:boolean`; rejects `undefined`.
- **`sessionStore.test.ts` (extend)** — `setSetValue`/`toggleSet` mutate `loggedSets`; `seedExercise` seeds; `clearSession` empties `loggedSets`; partialize includes `loggedSets`.
- **`createAssignment.test.ts` (extend)** — snapshot exercise carries `repsMin/repsMax/targetRpe/timed`; alternative-exercise branch too; missing source fields default safely (timed⇒false/omitted).

### Sampling Rate
- **Per task commit:** the single relevant `npx jest <file> -x`.
- **Per wave merge:** `npx jest` (full suite green).
- **Phase gate:** Full suite green before `/gsd-verify-work`; plus on-device timer/alarm manual check after the EAS dev-client rebuild (audio + haptics are not unit-verifiable).

### Wave 0 Gaps
- [ ] `src/lib/sessionFinalize.ts` + `__tests__/sessionFinalize.test.ts` — LOG-04, D-08, HIST-04 invariant
- [ ] `src/lib/prefill.ts` + `__tests__/prefill.test.ts` — LOG-03, D-09
- [ ] `src/lib/timer.ts` + `__tests__/timer.test.ts` — TIMR-03
- [ ] `src/hooks/useCountdownTimer.ts` + `__tests__/useCountdownTimer.test.ts` — TIMR-03/04 (mock 3 expo modules)
- [ ] `src/validation/loggedExercise.schema.ts` + test — LOG-04
- [ ] Extend `routine.schema.test.ts` — PRES-01
- [ ] Extend `sessionStore.test.ts` — LOG-01/02
- [ ] Extend `functions/src/__tests__/createAssignment.test.ts` — PRES propagation
- Framework install: none (jest already configured).

## Security Domain

> `security_enforcement: true`, ASVS level 1. This phase adds no auth/network surface; it's local logging + an additive Firestore write through existing rules.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | unchanged (RNFB auth) |
| V3 Session Management | no | unchanged |
| V4 Access Control | yes | Firestore rules already scope SESSIONS to `clientId === auth.uid`; the new `loggedExercises` is inside the same doc — **verify `firestore.rules` allows the new field shape and still validates ownership on create** |
| V5 Input Validation | yes | zod v4 on builder (rep range, RPE bounds) + finalize coercion to null; clamp RPE 1–10, sets/reps positive |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client writes arbitrary `loggedExercises`/inflated volume | Tampering | Firestore rules ownership check; numeric bounds in rules if feasible; single create (no update) preserves immutability D-12 |
| Cross-client read of logged loads | Info disclosure | Existing per-client SESSIONS rules unchanged; confirm no new read path leaks |
| Cloud Function field injection via routine | Tampering | `buildSnapshotExercise` reads only known fields; coerce types server-side |

**Action for planner:** add a task to review `firestore.rules` for the SESSIONS create path so the new field is permitted and ownership/immutability still enforced (the rules file is modified per git status — verify current state).

## State of the Art
| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-av for sound | expo-audio | SDK 53 deprecated → 54 removed | Must use expo-audio for the alarm |
| Per-exercise checkbox | Per-set rows + derived completion | This phase | UI replaced; completion semantics preserved (≥1 set) |

**Deprecated/outdated:** expo-av (removed SDK 55) — do not add.

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx expo install` resolves SDK-55-compatible expo-audio/haptics/keep-awake (npm latest is 56.x) | Standard Stack | Low — if no SDK-55 build exists, may need exact version pin from Expo compat table |
| A2 | expo-audio play/release API per the hook sketch | Pattern 1 | Medium — verify against installed docs before coding the alarm |
| A3 | Adding `loggedSets` to partialize is forward-compatible on hydration (missing key ⇒ initial) | Session Store | Low — zustand persist merges shallow; confirm in store test |
| A4 | Cloud Function redeploy may 403 → re-run `scripts/grant-invoker.mjs` | Runtime Inventory | Low — documented in project memory |
| A5 | `firestore.rules` currently permits the SESSIONS create shape | Security | Medium — rules file is modified in git status; verify before relying |
| A6 | slopcheck-equivalent assurance from "Expo first-party" status | Package Audit | Low — packages are in the official Expo monorepo |

## Open Questions
1. **expo-audio exact API for SDK 55.** What we know: it's the official replacement; uses a player model. What's unclear: precise call to play a one-shot bundled asset and release. Recommendation: read installed package docs immediately after `npx expo install`; keep the alarm call isolated in `useCountdownTimer` so it's swappable.
2. **Keep `toggleExercise`/`completedExerciseIds` in the store, or derive only at finalize?** Recommendation: derive at finalize from `loggedSets` (single source of truth); keep `completedExerciseIds` out of live state unless a UI element needs it live (the card "complete" treatment can read `loggedSets` directly).
3. **RPE half-steps (0.5) vs integer.** D-03 allows integer fallback. Recommendation: integer-only is acceptable for v1.1 if the 0.5 stepper adds risk; schema permits 0.5 either way.

## Environment Availability
| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Expo SDK | whole phase | ✓ | 55.0.26 | — |
| zod v4 | validators | ✓ | ^4.4.3 | — |
| jest/jest-expo | Wave 0 tests | ✓ | 29.7.0 / ~55.0.18 | — |
| expo-audio | TIMR-04 alarm | ✗ | — | install via `npx expo install` |
| expo-haptics | TIMR-04 vibration | ✗ | — | install via `npx expo install` |
| expo-keep-awake | TIMR-03 | ✗ | — | install via `npx expo install` |
| EAS dev-client build | native modules on device | (cloud) | — | required — no local Android SDK |
| slopcheck | supply-chain audit | ✗ | — | manual `checkpoint:human-verify` (Expo first-party) |

**Missing dependencies with no fallback:** none (all have install/verify paths).
**Missing with fallback:** the three expo modules (install) + slopcheck (manual checkpoint).

## Sources

### Primary (HIGH confidence)
- Codebase (read this session): `src/types/{session,routine,assignment}.ts`, `src/stores/sessionStore.ts`, `src/app/client/workout/session.tsx`, `src/lib/{firestoreWrite,workoutDayComputer,adherence,sessionDetail,mutationFeedback}.ts`, `src/services/session.service.ts`, `src/hooks/useFinishSession.ts`, `src/validation/routine.schema.ts`, `src/components/routines/RoutineExerciseRow.tsx`, **`functions/src/index.ts` (buildSnapshotExercise)**, `jest.config.js`, existing `__tests__/*`
- `.planning/phases/05-.../05-CONTEXT.md` (D-01..D-11), `05-UI-SPEC.md`
- `.planning/research/SUMMARY.md`, `.planning/REQUIREMENTS.md`, `CLAUDE.md`
- npm registry via `npm view` — expo-audio 56.0.11, expo-haptics 56.0.3, expo-keep-awake 56.0.3 (published 2026-06-01)

### Secondary (MEDIUM confidence)
- Project auto-memory: EAS dev-client rebuild requirement; RNFB v24 `exists()` method; `grant-invoker.mjs` 403 fix

### Tertiary (LOW confidence)
- expo-audio API shape (sketch only — verify post-install)

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH — settled in CLAUDE.md/SUMMARY.md, versions verified on npm
- Architecture/integration: HIGH — grounded in actual code, including the server-side snapshot trap
- Validation architecture: HIGH — mirrors existing jest pure-lib pattern
- expo-audio API specifics: LOW — verify against installed package

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stable; re-check expo-audio API if SDK changes)
