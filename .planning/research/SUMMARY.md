# v1.1 Research Summary — Performance Tracking & Timers

**Milestone:** v1.1 (Phases 5+) · **Scope:** per-set logging, trainer set/timer config, rest+work timers with alarm, Training Insights (PRs + strength/volume trends), coach visibility.
**Method:** focused inline research (web + codebase) — the unknowns were narrow (RN charting lib, SDK-55 timer/alarm stack, per-set session schema). Date: 2026-06-05.
**Note:** v1.0 project-level research is archived alongside as `SUMMARY-v1.0.md` (+ STACK/FEATURES/ARCHITECTURE/PITFALLS from May 27).

---

## Stack additions (use `npx expo install` to get SDK-55-pinned versions; run the supply-chain checkpoint before approving each)

| Need | Library | Why | Confidence |
|------|---------|-----|------------|
| Charts (strength/volume bars, PR sparkline) | **react-native-gifted-charts** (+ `react-native-svg`) | SVG-based, no Skia, Expo-friendly, actively maintained, simple declarative API; matches our modest chart needs (a few bars + a line). Works on our existing dev-client. | HIGH |
| Alarm sound on timer finish | **expo-audio** | `expo-av` is **removed in SDK 55**; expo-audio is the official replacement (lock-screen/background support). Play a short bundled alarm asset on countdown==0. | HIGH |
| Vibration on timer finish | **expo-haptics** | Official Expo module; Android Vibrator + iOS haptics + web Vibration API. `notificationAsync(Success)` or a `Vibration` pattern. | HIGH |
| Keep screen on during a running timer | **expo-keep-awake** | Prevents the device sleeping mid-rest; JS timers suspend when the screen locks. Activate while a timer runs, deactivate on stop. | HIGH |
| (Optional) background alarm | expo-notifications | If the app is backgrounded, JS timers pause. Schedule a one-shot local notification at the computed end-time so the alarm still fires. **Nice-to-have**, not required for MVP timer. | MEDIUM |

**Rejected / deferred:**
- **victory-native (XL)** — Skia + Reanimated GPU charts; excellent but heavier (adds `@shopify/react-native-skia`) and overkill for non-interactive bars. Documented as the upgrade path if Insights grows interactive/large-dataset charts.
- **react-native-timer-picker** — nice duration picker w/ haptics, but the trainer sets rest/duration as plain numbers in the builder; a numeric field is enough. Not needed.
- **Native AlarmKit / expo-alarm modules** — true OS alarms (fire when app killed) are overkill for an in-workout rest timer and add native complexity. Out of scope.

---

## Feature behavior (how these typically work)

### Per-set logging (table-stakes for strength apps)
- Trainer **prescribes at the exercise level**: `sets` (count), `reps` (or a rep range — see schema note), optional `targetRpe`, plus `rest`/`duration` (already present). No per-set prescription.
- Client sees one **row per set** (1..sets): inputs for **weight**, **reps**, **RPE**, and a **done** checkbox — exactly the `Rutina del Día` mockup (`SET | PESO | REPS | RPE | STATUS`).
- Sensible UX: prefill each set's weight/reps from the **previous session's** same-exercise log (or the trainer target) so logging is one tap when nothing changed. Last-set values carry down to the next set.
- Units: store weight in **kg** (numeric); display unit can be a later concern. The mockup shows both KG and LB per-exercise — defer unit toggle; standardize on kg for v1.1.

### Rest + work timers
- **Rest timer**: after a set is checked done, offer a "Rest 90s" countdown from `RoutineExercise.rest`. Visual ring + remaining seconds; alarm + vibration at 0.
- **Work timer**: for timed exercises (those with `duration` and no rep target — e.g. plank 60s), a "Start 60s" countdown from `RoutineExercise.duration`.
- **Reliability pattern**: store `endsAt = Date.now() + seconds*1000`; render remaining = `endsAt - now` on a 250ms tick (`setInterval`/Reanimated). On app foreground, recompute from `endsAt` (don't trust accumulated ticks). Keep-awake while running. Fire sound+haptics once when remaining ≤ 0.

### Training Insights (client) — derived, no new logging
- **Personal Records**: per exercise, best set by **estimated 1RM** (Epley: `weight * (1 + reps/30)`) across all logged sessions; also show heaviest weight. "NEW" badge when the latest session set a PR.
- **Strength/volume trend**: per session (or per week), **total volume = Σ(weight × reps)** over completed sets; render as a bar/line trend. Optionally per-exercise volume.
- ⚠️ The mockup's **push/pull/legs** grouping needs a *movement-pattern* tag we don't have (`ExerciseCategory` is strength/cardio/hypertrophy/HIIT/mobility/functional, not push/pull/legs). Either (a) add an optional `movementPattern` tag to Exercise, or (b) **simplify v1.1 to overall + per-exercise volume** (recommended — avoids re-tagging the library). Decision deferred to discuss/plan.

---

## Architecture / integration

### Existing schema (verified in code)
- `RoutineExercise` (in `src/types/routine.ts`) **already has** `sets`, `reps?`, `duration?`, `rest`, `notes?`, `alternativeExerciseId?`, `order`. → **Timer config already in the data model.** Gaps: (a) the builder UI must actually capture `rest`/`duration` (verify in `src/app/trainer/routines/*`), (b) optional `targetRpe?` to show an RPE target.
- `Session` (in `src/types/session.ts`) stores `completedExerciseIds: string[]` + `totalExercises` + derived `routineName`. Written **once on finish, never mutated** (D-12/D-13).

### New data: per-set actuals on Session
Extend `Session` with a detailed log (additive, back-compatible):
```ts
interface LoggedSet { setNumber: number; weight: number | null; reps: number | null; rpe: number | null; completed: boolean }
interface LoggedExercise { exerciseId: string; name: string; sets: LoggedSet[] }
// add to Session:
loggedExercises?: LoggedExercise[];   // optional → old sessions omit it; PR/trend code must null-guard
```
- Keep `completedExerciseIds`/`totalExercises` (adherence HIST-04 + StatusBadge still derive from them — an exercise counts "complete" when ≥1 set checked, matching the existing partial-counts adherence rule).
- Still a **single write on finalize** (Zustand + AsyncStorage hold live per-set state mid-session; persists D-13 crash-safety). The session store already exists from Phase 3 — extend its shape.
- **Firestore writes** must go through `stripUndefinedDeep` (nulls not undefined) — existing convention.

### PR / trend computation
- Pure functions over a client's sessions (mirror `src/lib/adherence.ts` style): `computePersonalRecords(sessions)`, `computeVolumeTrend(sessions)`. Unit-testable (Wave 0), no Firestore. Feed both client Insights and the coach's per-client view.
- Data fetch: reuse `useSessionHistory(clientId)` / `fetchSessionsForAssignment`; PRs/trends are all-time or per-active-program (decide in discuss).

### New navigation
- Client **Insights tab** (the mockup's 4th nav item: Training / Insights / Programs / Profile). Add Insights to the client tab set.

---

## Pitfalls / watch-outs

1. **expo-av is gone (SDK 55).** Do NOT add expo-av for the alarm. Use expo-audio. (Project already avoids expo-video for YouTube; sound is separate.)
2. **JS timers pause when backgrounded/locked.** Never count ticks; always derive remaining from an absolute `endsAt`. Add keep-awake while running. Background firing needs a scheduled notification (optional).
3. **Back-compat for old sessions.** `loggedExercises` is optional; every PR/trend/detail reader must handle its absence (Phase 1–4 sessions have none) — show "no load data" gracefully.
4. **push/pull/legs grouping isn't in our taxonomy.** Don't silently mis-map `ExerciseCategory`. Either add a movement tag or simplify the trend to overall/per-exercise (recommended).
5. **Native rebuild required.** expo-audio/expo-haptics/react-native-svg are native → another **dev-client rebuild** (EAS, no local Android SDK) before on-device timer/chart testing. Same pattern as expo-image-picker in v1.0.
6. **Supply-chain checkpoint.** react-native-gifted-charts is third-party (not Expo-maintained) — verify maintainer/repo/install-hooks via npm metadata before install (project convention).
7. **Single-write invariant.** Keep the "session written once on finalize" rule; don't introduce per-set Firestore writes (cost + offline + matches D-12/D-13). Live state stays in Zustand+AsyncStorage.
8. **Don't bloat the trainer flow.** Coach visibility must add zero required steps — surface in existing session detail; the per-client Insights is opt-in/view-only.

---

## Suggested build order (for the roadmapper)
1. **Schema + logging foundation** — extend Session type + session store + finalize write; trainer builder captures rest/duration/(targetRpe); per-set logging UI on the workout screen; rest+work timers w/ alarm. (Native rebuild here.)
2. **Insights + coach visibility** — PR/volume pure functions (Wave 0 tests), client Insights tab + charts, per-set loads in session detail, per-client Insights for the coach.

(Roadmapper decides exact phase split + success criteria.)

---
*Research completed 2026-06-05 · consumed by requirements definition + roadmap.*
