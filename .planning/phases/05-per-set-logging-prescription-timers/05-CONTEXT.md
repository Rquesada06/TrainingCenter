# Phase 5: Per-Set Logging, Prescription & Timers - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn passive "mark complete" workouts into logged, measurable training. This phase delivers, on the **existing client workout screen** (`src/app/client/workout/session.tsx`) and the **existing routine builder**:

- **Trainer prescription** of per-exercise targets (sets count, rep range, target RPE) plus timer values (rest seconds, work duration) — PRES-01/02/03.
- **Client per-set logging** of actual weight + reps + RPE with a per-set done check — LOG-01/02/03/04.
- **Rest + work timers** the client runs from the trainer's configured values, foreground-only, with an alarm sound + vibration — TIMR-01/02/03/04.

**NOT in this phase:** Insights/PRs/volume charts and coach visibility (that's Phase 6). No bodyweight/body-fat, no wearables, no push/pull/legs grouping, no background timer alarm, no kg/lb toggle (all v2 / out of scope per REQUIREMENTS.md).
</domain>

<decisions>
## Implementation Decisions

### Set-row logging UX (LOG-01/02)
- **D-01:** Client enters **weight and reps via a numeric keypad** (tap field → keypad); **RPE via a compact 1–10 picker** (not typed). RPE may be left blank.
- **D-02:** With prefill (D-09), an unchanged set requires **only the done-check** — no re-entry. Last-set values carry down to the next set within an exercise.
- **D-03:** Weights are in **kg** only (no unit toggle — v2). RPE granularity: the mockup shows half-steps (8.5/9) — allow **0.5 increments** in the picker (planner's call on exact widget; integer fallback acceptable).

### Timers (TIMR-01/02/03/04)
- **D-04:** The **rest timer auto-starts** the moment a set is checked done, shown as an **inline bar at the bottom** of the workout screen (client keeps scrolling/logging). Controls: **Skip** and **+15s**. Rest seconds come from the exercise's `rest`.
- **D-05:** The **work/duration timer** is a **Start button** on a timed exercise (no auto-start), counting down from the exercise's `duration`. Same Skip/+15s controls.
- **D-06:** Timers are **foreground-only**: keep the screen awake while running (`expo-keep-awake`), derive remaining from an **absolute `endsAt`** (recompute on foreground — never trust accumulated ticks), and fire **alarm sound (`expo-audio`) + vibration (`expo-haptics`)** once at 0. No background notification (v2 TIMR-05).

### Finishing a session (LOG-04)
- **D-07:** The client can **finish anytime**. Unlogged sets save as **null / unchecked** (no blocking, no confirmation). Fast over strict.
- **D-08:** An exercise **counts "complete" when ≥1 of its sets is checked done** — this preserves the existing partial-adherence rule and back-compat with `Session.completedExerciseIds` (which must still be derived/maintained for adherence HIST-04 + StatusBadge).

### Prefill (LOG-03)
- **D-09:** Each set **prefills from the client's last session** for that exercise (actual weight/reps); **falls back to the trainer's target** on the first session. Supports progressive overload — next session starts where the last left off.

### Trainer prescription shape (PRES-01/03)
- **D-10:** Reps are prescribed as a **rep range (min–max)**, e.g. 8–10 (per the mockup) — requires a small schema addition (`repsMin`/`repsMax` or equivalent) to the routine prescription; the single legacy `reps?` may be migrated/retained as the planner sees fit.
- **D-11:** A **"timed" exercise is marked by an explicit toggle** in the builder. Timed → show a **duration field**, no weight/reps rows, **work timer**. Weighted → show **sets × rep-range (+ target RPE)**, **rest timer**. (Don't infer from field presence — explicit is unambiguous for both builder and client rendering.) `duration` and `rest` already exist on `RoutineExercise`.

### Claude's Discretion (planner/researcher decide)
- Exact schema field names/shape for `loggedExercises`, `repsMin/repsMax`, `targetRpe`, and the timed flag on `RoutineExercise`; how `completedExerciseIds` is derived on finalize.
- The RPE picker widget and whether half-steps are supported.
- Inline timer-bar visual design (defer to `/gsd-ui-phase 5` for the UI contract).
- Session-store shape for live per-set state and its `partialize`/persist discipline.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / requirements
- `.planning/REQUIREMENTS.md` — v1.1 requirements; this phase covers LOG-01..04, PRES-01..03, TIMR-01..04. Locked scope + out-of-scope.
- `.planning/research/SUMMARY.md` — v1.1 research: charting deferred to Phase 6; **timer/alarm stack (expo-audio/expo-haptics/expo-keep-awake; expo-av is REMOVED in SDK 55)**; per-set session schema design; pitfalls (JS timers pause backgrounded → absolute endsAt; old sessions lack load data; native rebuild required; supply-chain checkpoint).
- `.planning/PROJECT.md` — Key Decisions (single finalize write D-12/D-13; stripUndefinedDeep; snapshot immutability).

### Design reference
- `stitch_coach_lab_training_platform/rutina_del_d_a_coach_lau/screen.png` + `code.html` — the per-set Training mockup: `SET | PESO (KG) | REPS | RPE | STATUS` rows, green done-checkbox, per-exercise card. This is the target layout for the logging UI.

### Code to extend (full paths)
- `src/types/session.ts` — add `LoggedSet`/`LoggedExercise` + optional `loggedExercises?` to `Session` (additive, back-compatible).
- `src/types/routine.ts` — `RoutineExercise` already has `sets`, `reps?`, `duration?`, `rest`; add rep range + `targetRpe?` + timed flag.
- `src/stores/sessionStore.ts` — extend live state with per-set logging (keep persist/partialize/clearSession discipline; this is the crash-safe store).
- `src/app/client/workout/session.tsx` — FlatList of single-open expand exercise rows; replace per-exercise checkbox with per-set rows + inline timer bar; the finalize batch-write path adds `loggedExercises` + derived `completedExerciseIds`.
- `src/components/routines/RoutineExerciseRow.tsx`, `src/components/routines/RoutineBuilder.tsx`, `src/components/routines/ExercisePickerSheet.tsx` — builder prescription fields (rep range, target RPE, rest, duration, timed toggle).
- `src/lib/firestoreWrite.ts` (`stripUndefinedDeep`) + `src/lib/mutationFeedback.ts` (`withSaveFeedback`) — required write wrappers.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`sessionStore` (Zustand + persist + AsyncStorage)** — already crash-safe with `partialize` (data-only), date-rollover `clearSession`, `startSession`/`toggleExercise`. Extend with per-set state; the persistence pattern is established (Phase 3 D-11/D-14).
- **`workout/session.tsx`** — already a single-open expand `FlatList` with a finalize batch-write to Firestore. The per-exercise checkbox becomes per-set rows; the finalize payload extends.
- **`RoutineExercise`** — already carries `sets`/`reps`/`duration`/`rest` → most timer config exists; the builder just needs to capture/expose it + new range/RPE/timed fields.
- **Conventions**: `stripUndefinedDeep` on every Firestore write; `withSaveFeedback` on screen mutations; date helpers in `src/lib/workoutDayComputer.ts`; RNFB v24 `snap.exists()` is a method.

### Established Patterns
- **Single write on finalize** (D-12/D-13): live per-set state lives in Zustand+AsyncStorage; one Firestore write on finish. Do NOT write per-set to Firestore.
- **Additive/back-compatible schema**: `loggedExercises?` optional; every reader null-guards (Phase 1–4 sessions have none).
- **Native modules need a dev-client rebuild** (no local Android SDK → EAS), as with expo-image-picker in v1.0. This phase adds `expo-audio`, `expo-haptics`, `expo-keep-awake` (and `react-native-svg` lands in Phase 6).

### Integration Points
- `completedExerciseIds`/`totalExercises` must stay populated (derived from `loggedExercises` on finalize) so adherence (HIST-04) and `StatusBadge` keep working unchanged.
- Phase 6 consumes `loggedExercises` for PRs/volume — keep set fields clean (numeric weight/reps/rpe, `completed` bool).
</code_context>

<specifics>
## Specific Ideas
- Target layout is the `rutina_del_día` StitchUI mockup: per-exercise card, `SET | PESO (KG) | REPS | RPE | STATUS` rows, green done-check, RPE shown with half-steps (8.5).
- "One tap when nothing changed" — prefill + done-check is the core speed goal for logging.
- Coach visibility (the *why* behind logging) is built in Phase 6 with zero extra trainer steps.
</specifics>

<deferred>
## Deferred Ideas
- **Background timer alarm** (fire when app backgrounded/locked) → v2 TIMR-05.
- **kg/lb unit toggle** → v2 TIMR-06.
- **Push/pull/legs trend grouping** (needs movement-pattern tags) → v2 INST-03.
- **Insights / PRs / volume charts + coach visibility** → Phase 6 (next phase, already roadmapped).

None of these were scope-creep pushes from the user — they were settled at the milestone boundary and are listed here so the planner doesn't pull them in.
</deferred>

---

*Phase: 5-Per-Set Logging, Prescription & Timers*
*Context gathered: 2026-06-05*
