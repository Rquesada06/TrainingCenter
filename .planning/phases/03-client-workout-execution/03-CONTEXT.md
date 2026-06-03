# Phase 3: Client Workout Execution - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

The client-side read-and-execute experience. The client opens the app and immediately
sees the correct home state computed from their assigned program **snapshot**, runs the
workout session (exercise detail, per-exercise completion, session-level gym/home
toggle), and saves a complete session record to Firestore on finish — with crash-safe
local progress throughout and a guard against duplicate sessions per day.

In scope: WORK-01..09 (home states, today's-workout calculation from the snapshot,
exercise detail, completion checkboxes, gym/home toggle, finish + celebration + Firestore
save, AsyncStorage crash-safe resume, duplicate-session prevention).

Out of scope (later phases): session history/stats screens, profile/photo editing,
trainer-side review of client sessions, push notifications.
</domain>

<decisions>
## Implementation Decisions

### Today's-workout logic
- **D-01:** "Today" maps to the snapshot by a **date-only day offset** from `startDate`:
  `dayOffset = wholeDays(today − startDate)` using local date-only math (no timezone
  drift — `startDate` is `YYYY-MM-DD`). `weekIndex = floor(dayOffset / 7)`,
  `dayIndex = dayOffset % 7`.
- **D-02:** If `today < startDate` → **"Program starts in N days"** state (N = days until startDate).
- **D-03:** When `dayOffset >= durationWeeks * 7` (program finished) → terminal
  **"Program complete"** state prompting the client to ask their trainer for the next
  program. The program does **NOT** loop and does **NOT** hold on the last day.
- **D-04:** A day whose snapshot `type` is `'rest'` **OR** `null` (unassigned) is treated
  as a **Rest day** (home state 3).
- **D-05:** A day with `type: 'routine'` and a non-empty routine → **Active workout** (state 4).

### Home screen states (WORK-01, WORK-02)
- **D-06:** On open, the Home (client `index`) screen shows exactly one correct state with
  no extra navigation: (1) No program assigned, (2) Program starts in N days, (3) Rest day,
  (4) Active workout. Plus two terminal/derived states: **Program complete** (D-03) and
  **Workout already completed today** (D-12).

### Session execution UX (WORK-03, WORK-04)
- **D-07:** **Single scrollable list** of exercises with **inline completion checkboxes**.
  Tapping a row **expands its detail in place**: sets × reps (or duration), rest, trainer
  notes, and embedded **video (expo-video)** or **image (expo-image)**. No per-exercise
  screens, no swipe-through.

### Gym/home toggle (WORK-05)
- **D-08:** A **session-level** gym/home toggle at the top of the workout. Toggling swaps
  each exercise to the variant matching the mode using the snapshot's `alternativeExercise`
  + `locationTypes`.
- **D-09:** Default mode = the client's **last chosen mode, persisted across sessions**.
  First-ever session defaults to **Gym**.
- **D-10:** An exercise with **no valid variant** for the chosen mode is **always kept and
  shown** (its only variant) with a subtle **"gym only" / "home only"** tag. Never hide or
  drop trainer-programmed work.
- **D-11:** The chosen mode persists for the whole session (stored in local session state
  and the final session record).

### Finish, resume & duplicate guard (WORK-06..09)
- **D-12:** Once today's workout is completed, Home shows a **"Workout complete" done
  state** with a summary, and the client can tap to **re-open today's completed session
  read-only**. No new session can be started for the same day (WORK-09 duplicate guard).
- **D-13:** **"Finish Workout" is always tappable.** If some exercises are unchecked, show
  a confirm **"Finish with X of Y done?"** before saving (WORK-06 manual bypass). On
  finish: save a complete **session record to Firestore** and show a **celebration/summary**
  screen (WORK-07).
- **D-14:** Crash-safe local state via **AsyncStorage** (WORK-08): persist the in-progress
  session (checked exercise ids, gym/home mode, `startedAt`, week/day index, date) keyed
  per **client + date**. On reopen with an in-progress session for **today**, **prompt
  "Resume / Start over"** (Resume restores checks + mode). Local state is cleared on finish
  and when the date rolls over.
- **D-15:** The rest-day motivational message **rotates from a small built-in set** (varies
  by date) rather than a single static line.

### Claude's Discretion
- **Session record shape** (Firestore `sessions/{id}`): at minimum `clientId`, `trainerId`
  (from the assignment), `assignmentId`, `date` (YYYY-MM-DD), `weekIndex`, `dayIndex`,
  `mode`, `completedExerciseIds[]`, `totalExercises`, `startedAt`, `completedAt`. Researcher/
  planner finalize exact fields.
- **Celebration/summary content** (e.g. exercises completed/total, optional duration from
  `startedAt → completedAt`, a congratulatory line).
- Exact copy for "Program starts in N days", "Program complete", and rest-day messages.
- The **AsyncStorage dependency** (`@react-native-async-storage/async-storage`) is almost
  certainly required — planner confirms install (JS-only; supply-chain checkpoint applies
  per CLAUDE.md if a NEW package).
- Whether the read-only completed-session view (D-12) reuses the live session list component
  in a disabled state or a dedicated summary.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 3: Client Workout Execution" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` — WORK-01..09 full text

### Data model the client consumes (CRITICAL)
- `src/types/assignment.ts` — `Assignment` + `AssignmentSnapshot` shape. The snapshot is the
  **single source of truth**: `weeks[].days[].{type, routine{name, exercises[]}}`; each
  exercise carries `sets/reps/duration/rest/notes/videoUrl/imageUrl/locationTypes` and a
  nested `alternativeExercise` (the gym/home substitute). Snapshot fields use `null`, never
  `undefined`.
- `src/types/exercise.ts` — `LocationType` (`'gym' | 'home' | 'both'`) drives D-10.

### Backend already in place (Phase 2)
- `firestore.rules` § `match /sessions/{sessionId}` — client can create/update **own** sessions
  (`clientId == request.auth.uid`); trainer can read their clients' sessions. Reads of the
  client's own assignment: `match /assignments` allows `isClient() && resource.data.clientId == uid`.
- `firestore.indexes.json` — `sessions` composite index `(clientId ASC, date DESC)` already
  exists (use it for the duplicate-guard query).

### Conventions / stack
- `CLAUDE.md` — stack + version table (zod v4, TanStack Query v5, @react-native-firebase v24,
  NativeWind v4, expo-video, expo-image, expo-secure-store).
- Memory: **RNFB v24 `DocumentSnapshot.exists` is a METHOD** — always `snap.exists()`,
  `querySnap.empty` for collection queries.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/firestoreWrite.ts` → `stripUndefinedDeep` — use before any `sessions` write.
- `src/lib/mutationFeedback.ts` → `withSaveFeedback` — wrap the finish-save mutation.
- `src/components/ui/PrimaryButton`, `src/components/ui/TextField`, `src/components/clients/ClientPhoto`.
- `src/services/*` + `src/hooks/*` — the Phase 2 pattern (pure service module + TanStack
  Query v5 hooks + components + screens). Mirror it for sessions.
- `src/app/client/_layout.tsx` — client tabs (Home `index`, Profile). Home is where the
  workout/states render; safe-area + tab icons already wired.
- `src/types/session.ts` — check whether a session type stub exists; if not, create it.

### Established Patterns
- Reads via `useQuery`; writes via `useMutation` + `withSaveFeedback`. Firestore writes go
  through `stripUndefinedDeep`. All `get()` existence checks use `snap.exists()` (RNFB v24).
- Obsidian Performance design system: bg `#0E0E0E`, surface `#1A1A1A`, accent `#00FF66`,
  warning `#FFD600`, muted `#888888`. Safe-area via `react-native-safe-area-context`
  `SafeAreaView` (NOT react-native's).

### Integration Points
- **New:** a client-side hook to read the client's **own** active assignment — query
  `assignments where clientId == self && status == 'active'` (the Phase 2
  `findActiveAssignmentForClient` is **trainer-scoped** and not reusable here).
- **New:** a "today's workout" selector (pure function over snapshot + startDate → state).
- **New:** sessions service + `useTodaySession`/duplicate-guard query + finish mutation.
- **New:** AsyncStorage-backed local session store (crash-safe).
- **Modify:** `src/app/client/index.tsx` (Home → the stateful workout entry) + new client
  workout screens.
</code_context>

<specifics>
## Specific Ideas

- The four-state home screen and the "today" computation are the heart of the phase — get
  the date-only offset math right (no timezone bugs) since `startDate` is date-only.
- Gym/home swap is purely client-side off the snapshot's `alternativeExercise` — no extra
  Firestore reads.
- Duplicate guard + "already completed today" + crash-resume all hinge on a per-(client,date)
  key — keep that key consistent between the AsyncStorage local state and the Firestore
  `sessions` duplicate query.
</specifics>

<deferred>
## Deferred Ideas

- Session **history / progress stats** screens — future phase (HIST-* requirements).
- Trainer-side review of completed client sessions — future phase.
- Push notifications / workout reminders — future phase.
- Profile editing (name/photo) for the client — future phase.

None of these were in scope; discussion stayed within WORK-01..09.
</deferred>

---

*Phase: 03-client-workout-execution*
*Context gathered: 2026-06-03*
