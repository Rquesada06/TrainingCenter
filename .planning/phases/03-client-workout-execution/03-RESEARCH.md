# Phase 3: Client Workout Execution — Research

**Researched:** 2026-06-03
**Domain:** React Native / Expo SDK 55 — date-only offset math, AsyncStorage crash-safe session state, Zustand persist, expo-video inline playback, Firestore duplicate guard, gym/home variant resolution
**Confidence:** HIGH (core findings verified against installed packages and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** "Today" = date-only day offset from `startDate` (YYYY-MM-DD). `dayOffset = wholeDays(today − startDate)` via local date-only math. `weekIndex = floor(dayOffset / 7)`, `dayIndex = dayOffset % 7`.
- **D-02:** `today < startDate` → "Program starts in N days" state.
- **D-03:** `dayOffset >= durationWeeks * 7` → terminal "Program complete" (no loop, no hold).
- **D-04:** Day `type === 'rest'` OR `null` → Rest day (state 3).
- **D-05:** Day `type === 'routine'` with non-empty exercises → Active workout (state 4).
- **D-06:** Home screen shows exactly one state: no program, starts in N days, rest day, active workout, program complete, or already completed today.
- **D-07:** Single scrollable exercise list, inline checkboxes, tap-to-expand row with sets/reps/duration/rest/notes + embedded expo-video / expo-image.
- **D-08:** Session-level gym/home toggle swaps exercises using snapshot `alternativeExercise` + `locationTypes`.
- **D-09:** Default mode = last chosen mode persisted across sessions; first-ever session defaults to Gym.
- **D-10:** Exercise with no valid variant for the chosen mode is always shown with a "gym only" / "home only" tag.
- **D-11:** Chosen mode persists in local session state and the final session record.
- **D-12:** Once completed, Home shows "Workout complete" done state; tap to re-open read-only.
- **D-13:** "Finish Workout" always tappable. Confirm if incomplete. On finish: save to Firestore + celebration screen.
- **D-14:** AsyncStorage crash-safe state keyed per client + date; Resume / Start-over prompt on reopen.
- **D-15:** Rest-day motivational message rotates from a small built-in set (varies by date).

### Claude's Discretion

- Session record shape (`sessions/{id}`) — at minimum `clientId`, `trainerId`, `assignmentId`, `date`, `weekIndex`, `dayIndex`, `mode`, `completedExerciseIds[]`, `totalExercises`, `startedAt`, `completedAt`.
- Celebration/summary content (exercises completed/total, optional duration, congratulatory line).
- Exact copy for home states and rest-day messages.
- Whether the read-only completed-session view reuses the live list in a disabled state or a dedicated summary component.

### Deferred Ideas (OUT OF SCOPE)

- Session history / progress stats screens (future phase, HIST-*)
- Trainer-side review of completed client sessions
- Push notifications / workout reminders
- Profile editing (name/photo) for the client
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORK-01 | Client's home screen shows today's workout on open | `computeTodayWorkout` pure function over snapshot + local date; four-state result; six states total with complete + done |
| WORK-02 | Four explicit home states: no program, starts in N days, rest day with motivational message, active workout | Home screen reads `useClientActiveAssignment` + `computeTodayWorkout`; renders one of six state components |
| WORK-03 | View exercise detail: sets × reps / duration, rest, notes, embedded video/image | Tap-to-expand row; `expo-video` VideoView + `expo-image` Image inline in expanded section |
| WORK-04 | Mark each exercise as completed with a checkbox | Zustand sessionStore `completedExerciseIds: Set<string>`; persisted via AsyncStorage |
| WORK-05 | Gym/home toggle — exercises with alternatives switch variant; persists for session | `resolveVariant` pure function over snapshot exercise + mode; session-level toggle; mode stored in sessionStore + AsyncStorage |
| WORK-06 | "Finish Workout" always tappable — confirm if incomplete | Alert.alert confirm flow; `useMutation` writes session to Firestore |
| WORK-07 | Completion shows celebration/summary + saves session to Firestore | Firestore `sessions` write via `stripUndefinedDeep`; navigation to summary screen |
| WORK-08 | In-progress state saved to AsyncStorage; resume prompt on next open | Zustand `persist` middleware with `createJSONStorage(() => AsyncStorage)`; `hasHydrated` gate |
| WORK-09 | Prevent duplicate session if already completed today | Query `sessions` where `clientId == self && date == today`; check `querySnap.empty`; uses existing (clientId+date) index |
</phase_requirements>

---

## Summary

Phase 3 builds entirely client-side on top of the Phase 2 data contracts. The assignment snapshot is already written immutably in Firestore; Phase 3 only reads it, computes local state, and writes one session document on completion. No Cloud Functions are needed. The most failure-prone areas are (1) date-only timezone math, (2) the crash-safe local session state across AsyncStorage + Zustand `persist`, and (3) `expo-video` which is NOT yet installed and requires a native rebuild.

**Key discovery:** `expo-video` is NOT in `package.json` and NOT in `node_modules` as a direct dep. The SDK 55 bundled version is `~55.0.17` (not `~2.0.x` — those are a separate non-SDK release train). Install command: `npx expo install expo-video`. This requires a native rebuild (EAS dev build or local `npx expo run:ios / run:android`).

**Key discovery:** `@react-native-async-storage/async-storage` IS already installed at `^2.2.0` as a direct dep (in `package.json`). No install needed. The SDK 55 bundled version is `2.2.0` — matches.

**Key discovery:** Both Firestore indexes required for Phase 3 already exist in `firestore.indexes.json`: `sessions (clientId ASC, date DESC)` for the duplicate guard, and `assignments (clientId ASC, status ASC)` for the client's own active assignment query. No new indexes to deploy.

**Primary recommendation:** Build the `sessionStore` (Zustand + persist + AsyncStorage), the `computeTodayWorkout` pure function, and the `useClientActiveAssignment` hook as Wave 0 foundations. Everything else (UI, session write, celebration) composes on top of these.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Today's workout computation | Client (pure function) | — | All data is in the assignment snapshot; no server round-trip needed |
| Home screen state selection | Client (UI component) | — | Derived from local computation + Firestore read |
| Gym/home variant resolution | Client (pure function) | — | Pure transform over snapshot fields; no network |
| Exercise completion tracking | Client (Zustand store) | AsyncStorage (persistence) | Ephemeral runtime state with crash-safe backup |
| Session creation / duplicate guard | Client via Firestore | Firestore rules | Rules enforce ownership; client reads own sessions |
| Session write on finish | Client (Firestore write) | Firestore rules | isClient() + clientId == uid rule already in place |
| Client reads own active assignment | Client via Firestore | Firestore rules | assignments read rule allows isClient() + clientId == uid |
| Video / image rendering | Client (expo-video, expo-image) | — | Embedded inline in expandable row; no server side |
| Crash-safe progress restore | Client (AsyncStorage) | Zustand persist | AsyncStorage survives app kill; Zustand is the runtime layer |

---

## Standard Stack

### Core (already installed — no new installs except expo-video)

| Library | Version (installed) | Purpose | Status |
|---------|---------------------|---------|--------|
| `@react-native-async-storage/async-storage` | `^2.2.0` | Crash-safe local session state | INSTALLED — `[VERIFIED: bundledNativeModules.json]` |
| `zustand` | `^5.0.14` | sessionStore (in-progress session runtime) | INSTALLED — `[VERIFIED: package.json]` |
| `zustand/middleware` (persist) | included in zustand | Persist sessionStore to AsyncStorage | INSTALLED — `[VERIFIED: node_modules/zustand/middleware/persist.d.ts]` |
| `expo-image` | `~55.0.11` | Inline exercise images | INSTALLED — `[VERIFIED: package.json]` |
| `@tanstack/react-query` | `^5.100.14` | Query hooks: active assignment, duplicate check | INSTALLED — `[VERIFIED: package.json]` |
| `@react-native-firebase/firestore` | `^24.0.0` | Session write + assignment + duplicate guard reads | INSTALLED — `[VERIFIED: package.json]` |

### New Package Required

| Library | Version (SDK 55 bundled) | Purpose | Install Command |
|---------|--------------------------|---------|-----------------|
| `expo-video` | `~55.0.17` | Inline video player in exercise detail | `npx expo install expo-video` |

**expo-video requires a native rebuild** (it uses a config plugin). After `npx expo install expo-video`, run `npx expo run:ios` / `npx expo run:android` locally or trigger an EAS build.

### Supporting (already installed)

| Library | Purpose |
|---------|---------|
| `react-native-reanimated` `4.2.1` | Expand/collapse animation for exercise row (FadeIn pattern already in `Collapsible` component) |
| `react-native-safe-area-context` | SafeAreaView for Home screen |
| `react-hook-form` + `zod` | NOT needed for Phase 3 (no new forms; session write is direct) |

**Installation for new packages:**
```bash
npx expo install expo-video
# Then rebuild native:
npx expo run:ios    # or eas build
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `expo-video` | npm | 6 yrs (expo-video created 2020-04-11) | github.com/expo/expo | [OK] | Approved — official Expo monorepo package |
| `@react-native-async-storage/async-storage` | npm | 6 yrs (created 2020-10-21) | github.com/react-native-async-storage/async-storage | [OK] | Already installed; scoped community package |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was available and ran successfully. Both packages confirmed [OK].*

---

## Architecture Patterns

### System Architecture Diagram

```
Client opens app
       │
       ▼
[useClientActiveAssignment]  ─── Firestore: assignments where clientId==self && status=='active'
       │                              (uses clientId+status index, already deployed)
       │ assignment (or null)
       ▼
[computeTodayWorkout(snapshot, startDate, today)]
       │
       ├─ null assignment        → State 1: No Program
       ├─ today < startDate      → State 2: Starts in N days
       ├─ dayOffset >= total     → State 3: Program Complete
       ├─ day.type == rest/null  → State 4: Rest Day (D-15 rotating message)
       └─ day.type == routine    ┐
                                 ▼
                    [useTodaySession + duplicate guard]
                    Firestore: sessions where clientId==self && date==today
                    (uses clientId+date index, already deployed)
                         │
                         ├─ session exists (status='completed') → State 5: Workout Already Done
                         └─ no session                          → State 6: Active Workout
                                   │
                                   ▼
                    [sessionStore (Zustand + AsyncStorage persist)]
                    ┌─────────────────────────────────────────────┐
                    │  checkedIds: Set<string>                    │
                    │  mode: 'gym' | 'home'                       │
                    │  startedAt: string                          │
                    │  date: string (YYYY-MM-DD)                  │
                    │  weekIndex, dayIndex                        │
                    └─────────────────────────────────────────────┘
                         │ on mount: check for stale resume state
                         │ on change: persist to AsyncStorage key
                         │         `laufit:session:{clientId}:{date}`
                         ▼
                    WorkoutExecutionScreen
                    ├─ GymHomeToggle → resolveVariant(exercise, mode)
                    ├─ FlatList of ExerciseRows
                    │   ├─ Checkbox → sessionStore.toggle(exerciseId)
                    │   └─ tap-to-expand → VideoView (expo-video) | Image (expo-image)
                    └─ FinishButton (always visible)
                              │ incomplete? → Alert confirm
                              │ confirmed   → useFinishSession mutation
                              ▼
                    Firestore: sessions.add(sessionRecord)  ← stripUndefinedDeep
                         │
                         ├─ sessionStore.clear() + AsyncStorage.removeItem(key)
                         └─ navigate → CelebrationScreen (summary)
```

### Recommended Project Structure

```
src/
├── types/
│   └── session.ts               # Session + LocalSessionState type contracts (new)
├── services/
│   └── session.service.ts       # findTodaySession(), createSession() (new)
├── hooks/
│   ├── useClientActiveAssignment.ts  # client-scoped (new; not a copy of trainer version)
│   ├── useTodaySession.ts            # duplicate guard query (new)
│   └── useFinishSession.ts           # useMutation: write + invalidate (new)
├── stores/
│   └── sessionStore.ts          # Zustand + persist + AsyncStorage (new)
├── lib/
│   └── workoutDayComputer.ts    # computeTodayWorkout() pure function (new)
├── lib/
│   └── variantResolver.ts       # resolveVariant(exercise, mode) pure function (new)
├── firebase/
│   └── firestore.ts             # ADD: sessionsCollection() typed ref
├── app/client/
│   ├── index.tsx                # MODIFY: stateful home with six states
│   └── workout/
│       ├── _layout.tsx          # new stack for workout screens
│       ├── session.tsx          # WorkoutExecutionScreen (active workout)
│       └── celebration.tsx      # CelebrationScreen (post-completion summary)
└── components/workout/
    ├── ExerciseRow.tsx           # expandable row with inline video/image
    ├── GymHomeToggle.tsx         # session-level gym/home toggle
    ├── FinishButton.tsx          # always-visible finish + confirm logic
    └── HomeStateCards.tsx        # no-program / starts-soon / rest / complete cards
```

### Pattern 1: Date-only Day Offset (no timezone drift)

**What:** Compute `dayOffset` between two YYYY-MM-DD strings using local midnight arithmetic.
**Why critical:** `new Date('2025-06-03')` parses as **UTC midnight**, so users in UTC-5 get "2025-06-02" locally — off by one day. This is the single most common silent bug in date-only apps.
**The fix:** Parse via component constructor → `new Date(y, m-1, d)` which uses **local midnight** in the device timezone.

```typescript
// Source: MDN Web Docs — Date constructor with >1 arg uses local time
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date

/** Parse "YYYY-MM-DD" as local midnight — avoids UTC interpretation drift. */
function parseDateOnly(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight, not UTC
}

/** Whole-day offset between two YYYY-MM-DD strings using local calendar dates. */
function dayOffset(startDateStr: string, todayStr: string): number {
  const start = parseDateOnly(startDateStr);
  const today = parseDateOnly(todayStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((today.getTime() - start.getTime()) / msPerDay);
}

/** Get today as YYYY-MM-DD in local time (NOT new Date().toISOString() which is UTC). */
function localTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

**DST safety:** Using `Math.floor(msDiff / msPerDay)` is safe across DST transitions because both dates are local midnight — DST shifts the wall-clock by ±1 hour but cannot create a fractional day between two midnights in the same timezone. The floor absorbs the 1-hour jitter (23h or 25h = still floor-1-day).

**Warning:** Never use `new Date(dateString)` for YYYY-MM-DD strings. Never use `.toISOString().slice(0,10)` for "today" — it returns UTC date, not local.

### Pattern 2: computeTodayWorkout Pure Function

```typescript
// src/lib/workoutDayComputer.ts
import type { Assignment } from '@/types/assignment';

export type WorkoutDayResult =
  | { state: 'no_assignment' }
  | { state: 'starts_soon'; daysUntilStart: number }
  | { state: 'rest' }
  | { state: 'program_complete' }
  | { state: 'active'; weekIndex: number; dayIndex: number; day: AssignmentSnapshotDay };

export function computeTodayWorkout(
  assignment: Assignment,
  todayStr: string
): WorkoutDayResult {
  const offset = dayOffset(assignment.startDate, todayStr);
  const totalDays = assignment.snapshot.durationWeeks * 7;

  if (offset < 0) return { state: 'starts_soon', daysUntilStart: -offset };
  if (offset >= totalDays) return { state: 'program_complete' };

  const weekIndex = Math.floor(offset / 7);
  const dayIndex = offset % 7;
  const day = assignment.snapshot.weeks[weekIndex]?.days[dayIndex];

  if (!day || day.type === 'rest' || day.type === null) return { state: 'rest' };
  return { state: 'active', weekIndex, dayIndex, day };
}
```

### Pattern 3: Client-Scoped Active Assignment Query

**Critical difference from Phase 2:** The Phase 2 `findActiveAssignmentForClient` requires `trainerId` (trainer-scoped rule). The client reads their OWN assignment — the rule `isClient() && resource.data.clientId == request.auth.uid` does NOT require `trainerId`. Create a new service function — do not reuse the trainer version.

```typescript
// src/services/session.service.ts (excerpt)
// Source: firestore.rules — assignments read: isClient() && resource.data.clientId == uid
import { assignmentsCollection } from '@/firebase/firestore';
import type { Assignment } from '@/types/assignment';

export async function findMyActiveAssignment(clientId: string): Promise<Assignment | null> {
  const snap = await assignmentsCollection()
    .where('clientId', '==', clientId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;  // querySnap.empty — RNFB v24 pattern
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Assignment;
}
```

**Index used:** `assignments (clientId ASC, status ASC)` — confirmed in `firestore.indexes.json`. No new index needed.

### Pattern 4: Duplicate Session Guard

```typescript
// src/services/session.service.ts (excerpt)
import { sessionsCollection } from '@/firebase/firestore';
import type { Session } from '@/types/session';

export async function findTodaySession(clientId: string, todayStr: string): Promise<Session | null> {
  const snap = await sessionsCollection()
    .where('clientId', '==', clientId)
    .where('date', '==', todayStr)
    .limit(1)
    .get();

  if (snap.empty) return null;  // querySnap.empty — RNFB v24
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Session;
}
```

**Index used:** `sessions (clientId ASC, date DESC)` — confirmed in `firestore.indexes.json`. No new index needed.

**Rule compliance:** `allow read: if isClient() && resource.data.clientId == request.auth.uid` — the `where('clientId', '==', clientId)` filter satisfies this.

### Pattern 5: Zustand sessionStore with AsyncStorage Persistence

**Decision from STATE.md:** "Phase 3: Session state in Zustand + AsyncStorage; single Firestore batch write on finalize only."

```typescript
// src/stores/sessionStore.ts
// Source: [CITED: https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocalSessionState {
  clientId: string | null;
  date: string | null;       // YYYY-MM-DD
  weekIndex: number | null;
  dayIndex: number | null;
  assignmentId: string | null;
  mode: 'gym' | 'home';
  completedExerciseIds: string[];
  startedAt: string | null;  // ISO timestamp
  isActive: boolean;         // true while a session is in progress
}

interface SessionStoreActions {
  startSession: (params: Omit<LocalSessionState, 'isActive' | 'completedExerciseIds'>) => void;
  toggleExercise: (exerciseId: string) => void;
  setMode: (mode: 'gym' | 'home') => void;
  clearSession: () => void;
}

const INITIAL: LocalSessionState = {
  clientId: null,
  date: null,
  weekIndex: null,
  dayIndex: null,
  assignmentId: null,
  mode: 'gym',
  completedExerciseIds: [],
  startedAt: null,
  isActive: false,
};

export const useSessionStore = create<LocalSessionState & SessionStoreActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      startSession: (params) => set({ ...params, isActive: true, completedExerciseIds: [] }),
      toggleExercise: (id) => {
        const { completedExerciseIds } = get();
        const next = completedExerciseIds.includes(id)
          ? completedExerciseIds.filter((x) => x !== id)
          : [...completedExerciseIds, id];
        set({ completedExerciseIds: next });
      },
      setMode: (mode) => set({ mode }),
      clearSession: () => set(INITIAL),
    }),
    {
      name: 'laufit:session',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist everything except actions
      partialize: (s) => ({
        clientId: s.clientId,
        date: s.date,
        weekIndex: s.weekIndex,
        dayIndex: s.dayIndex,
        assignmentId: s.assignmentId,
        mode: s.mode,
        completedExerciseIds: s.completedExerciseIds,
        startedAt: s.startedAt,
        isActive: s.isActive,
      }),
    }
  )
);
```

**Key: stale date detection.** On app open, check if `sessionStore.date !== localTodayString()`. If stale, call `clearSession()` — this prevents yesterday's partial workout from showing a resume prompt today.

**Key: resume prompt flow.** On the WorkoutExecutionScreen mount: if `sessionStore.isActive && sessionStore.date === today && sessionStore.clientId === currentUser.uid`, show "Resume / Start over" alert.

**Key: hasHydrated check.** The `persist` middleware rehydrates asynchronously. Before reading `sessionStore.isActive`, the component must wait for hydration. Use the persist API:

```typescript
// Gate on hydration before rendering the resume prompt
const [hydrated, setHydrated] = React.useState(false);
React.useEffect(() => {
  const unsub = useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  if (useSessionStore.persist.hasHydrated()) setHydrated(true);
  return unsub;
}, []);
```

### Pattern 6: expo-video Inline in Expandable Row

```typescript
// Source: [CITED: https://docs.expo.dev/versions/latest/sdk/video/]
import { useVideoPlayer, VideoView } from 'expo-video';

function ExerciseVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 200 }}
      contentFit="contain"
      nativeControls={true}
    />
  );
}
```

**Critical Android constraint:** Do NOT share a single `VideoPlayer` instance across multiple `VideoView` components — causes a crash on Android. Each expanded row that mounts a VideoView must have its own player instance via `useVideoPlayer`. [CITED: expo-video docs — "On Android, mounting multiple VideoView components at the same time with the same VideoPlayer instance will not work."]

**Memory:** `useVideoPlayer` auto-cleans on unmount. Because the exercise list uses tap-to-expand (only one or zero rows expanded at a time), only one VideoView is mounted at once — no memory pressure.

**Import path:** `import { useVideoPlayer, VideoView } from 'expo-video'` — same for both SDK 55 ~55.0.x and the standalone 2.x release.

### Pattern 7: expo-image Inline

```typescript
// Source: [CITED: https://docs.expo.dev/versions/latest/sdk/image/]
import { Image } from 'expo-image';

<Image
  source={exercise.imageUrl}
  style={{ width: '100%', height: 200 }}
  contentFit="contain"
/>
```

expo-image is already installed at `~55.0.11`. No install needed. Import path: `import { Image } from 'expo-image'`.

### Pattern 8: Gym/Home Variant Resolution

Pure function — no network calls. The snapshot's `alternativeExercise` contains the full nested exercise snapshot.

```typescript
// src/lib/variantResolver.ts
import type { AssignmentSnapshotExercise } from '@/types/assignment';

export type WorkoutMode = 'gym' | 'home';

export interface ResolvedExercise {
  exercise: AssignmentSnapshotExercise;
  /** null when the chosen mode is fully supported by this exercise */
  modeTag: 'gym_only' | 'home_only' | null;
}

/**
 * D-08: Swap exercise for its alternative if the alternative better matches `mode`.
 * D-10: If no valid variant exists for `mode`, keep the primary with a mode tag.
 *
 * LocationType 'both' means valid for gym AND home.
 */
export function resolveVariant(
  primary: AssignmentSnapshotExercise,
  mode: WorkoutMode
): ResolvedExercise {
  const primaryFits = primary.locationTypes.includes(mode) || primary.locationTypes.includes('both');
  const alt = primary.alternativeExercise;
  const altFits = alt ? (alt.locationTypes.includes(mode) || alt.locationTypes.includes('both')) : false;

  if (primaryFits) return { exercise: primary, modeTag: null };
  if (alt && altFits) return { exercise: alt, modeTag: null };

  // No valid variant — show primary with tag (D-10)
  const onlyMode = primary.locationTypes[0] === 'gym' || primary.locationTypes[0] === 'both' ? 'gym_only' : 'home_only';
  return { exercise: primary, modeTag: onlyMode };
}
```

### Pattern 9: Session Firestore Write

```typescript
// src/services/session.service.ts (excerpt)
// Mirror the Phase 2 pattern: stripUndefinedDeep before .add()
import { sessionsCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Session } from '@/types/session';

export async function createSession(
  data: Omit<Session, 'id'>
): Promise<string> {
  const ref = await sessionsCollection().add(stripUndefinedDeep(data));
  return ref.id;
}
```

**Rule compliance:** `allow create: if isClient() && request.resource.data.clientId == request.auth.uid` — the `clientId` field must be set to `request.auth.uid` in the session record.

### Pattern 10: Session Type Contract

```typescript
// src/types/session.ts (new file)
export interface Session {
  id: string;
  clientId: string;
  trainerId: string;
  assignmentId: string;
  /** YYYY-MM-DD */
  date: string;
  weekIndex: number;
  dayIndex: number;
  mode: 'gym' | 'home';
  completedExerciseIds: string[];
  totalExercises: number;
  startedAt: string;    // ISO timestamp string
  completedAt: string;  // ISO timestamp string
  /** Optional: routine name from snapshot for display in session history */
  routineName: string | null;
}
```

### Anti-Patterns to Avoid

- **`new Date('2025-06-03')` for date parsing:** Parses as UTC midnight → off-by-one in negative-UTC timezones. Always use the `parseDateOnly` component constructor pattern.
- **`.toISOString().slice(0,10)` for "today":** Returns UTC date, not local. Use `localTodayString()` with `getFullYear/getMonth/getDate`.
- **Sharing one VideoPlayer across multiple VideoViews:** Android crash. One player per VideoView instance.
- **`snap.exists` (property access) instead of `snap.exists()` (method):** RNFB v24 — `exists` is a method. Always `snap.exists()`, `querySnap.empty` (property, no call).
- **Importing `findActiveAssignmentForClient` from trainer service:** That function requires `trainerId` as a security filter. Clients do not have a `trainerId` to pass. Use `findMyActiveAssignment(clientId)` instead.
- **Writing `undefined` fields to Firestore:** Use `stripUndefinedDeep` from `src/lib/firestoreWrite.ts` before any `.add()`.
- **Not checking hydration before reading persist state:** `persist` middleware hydrates asynchronously. Reading `sessionStore.isActive` synchronously during initial render returns the initial value (false) — always gate on `hasHydrated()` or `onFinishHydration`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video playback | Custom WebView YouTube embed | `expo-video` | Native player, lifecycle-managed, SDK 55 standard |
| Session state persistence | Manual AsyncStorage read/write wiring | `zustand/middleware persist + createJSONStorage` | Handles serialization, merge, hydration callbacks, versioning |
| Image rendering | RN `<Image>` | `expo-image` | Caching, progressive loading, contentFit — RN Image lacks these |
| Date-only arithmetic | Moment.js / date-fns | Inline `parseDateOnly` helper | No new dep; the problem is 3 lines of math |
| Expand/collapse animation | Custom Animated.Value | `FadeIn` from react-native-reanimated (already used in `Collapsible`) | Already in codebase; consistent pattern |

**Key insight:** All date math for this phase is resolvable with stdlib JavaScript if the UTC trap is avoided. Introducing a date library (moment, date-fns) would be overkill for a single offset calculation.

---

## Common Pitfalls

### Pitfall 1: UTC Date Drift (off-by-one day)
**What goes wrong:** `new Date('2025-06-03')` in UTC-5 returns a Date at "2025-06-02 19:00 local" — floor to day gives June 2 not June 3. The workout shown is wrong.
**Why it happens:** ECMAScript spec: date-only ISO strings parse as UTC; date-time strings with no Z parse as local.
**How to avoid:** `parseDateOnly('2025-06-03')` → `new Date(2025, 5, 3)` — always local midnight.
**Warning signs:** Tests pass (UTC test environment) but prod users in UTC-5/UTC+5 see wrong workout.

### Pitfall 2: AsyncStorage Non-Persistence During Force Kill (iOS)
**What goes wrong:** If `setItem` is awaiting when the app is force-killed, the write may not flush.
**Why it happens:** iOS terminates the process before async write completes.
**How to avoid:** The `persist` middleware calls `setItem` synchronously on state change (in the middleware's subscribe callback) — not on component unmount. This is safer than calling `setItem` in `useEffect` cleanup. Using the `persist` middleware is the correct approach.
**Warning signs:** Resume prompt never appears after a crash. Mitigated by the middleware pattern.

### Pitfall 3: Hydration Race — Resume Prompt Flashes Then Disappears
**What goes wrong:** Component renders before AsyncStorage hydrates; initial state `isActive=false` shows "Start" screen briefly, then hydration loads `isActive=true` and flips to "Resume" — causing a flash.
**Why it happens:** `persist` hydration is async; first render uses default state.
**How to avoid:** Gate the resume check behind `hasHydrated()` using the `onFinishHydration` callback pattern shown in Pattern 5.
**Warning signs:** "Start" UI flashes for ~100ms before showing "Resume" prompt.

### Pitfall 4: Stale Session Date
**What goes wrong:** App is opened the next day. The persisted sessionStore has `date='yesterday'`, `isActive=true`. App shows "Resume" for yesterday's workout.
**Why it happens:** `clearSession()` is only called on finish; a never-finished session persists forever.
**How to avoid:** On every app open, compare `sessionStore.date` to `localTodayString()`. If different, call `clearSession()` before evaluating resume state.

### Pitfall 5: Duplicate Session Write Race Condition
**What goes wrong:** User taps "Finish" twice quickly. Two session documents get written for the same `(clientId, date)`.
**Why it happens:** No server-side unique constraint on `(clientId, date)` in Firestore.
**How to avoid:** (a) Disable the Finish button after first tap using `mutation.isPending`; (b) On the home screen, `useTodaySession` query re-validates after write — once a session exists, the button path is gone. The duplicate guard query (`findTodaySession`) also prevents starting a second session if navigated back.

### Pitfall 6: `sessionsCollection()` Not Yet in firestore.ts
**What goes wrong:** TypeScript error when creating the sessions service.
**How to avoid:** Add `sessionsCollection()` to `src/firebase/firestore.ts` in the first Wave 0 task — same pattern as `assignmentsCollection()`.

### Pitfall 7: expo-video Requires Native Rebuild
**What goes wrong:** `npx expo start` with Expo Go or a stale dev build shows a red screen "Native module not found: ExpoVideo".
**Why it happens:** expo-video uses native code registered via a config plugin.
**How to avoid:** After `npx expo install expo-video`, run `npx expo run:ios` / `npx expo run:android` or create an EAS dev build before testing video.

---

## Code Examples

### Gym/Home last-mode persistence (separate from sessionStore)

The "last chosen mode" (D-09) persists ACROSS sessions (not just within a session). This is a separate, simple AsyncStorage key — NOT in the sessionStore which is per-session.

```typescript
const LAST_MODE_KEY = 'laufit:lastWorkoutMode';

export async function getLastMode(): Promise<'gym' | 'home'> {
  const stored = await AsyncStorage.getItem(LAST_MODE_KEY);
  return (stored === 'home') ? 'home' : 'gym'; // default gym
}

export async function setLastMode(mode: 'gym' | 'home'): Promise<void> {
  await AsyncStorage.setItem(LAST_MODE_KEY, mode);
}
```

### TanStack Query v5 hook for client's own active assignment

```typescript
// src/hooks/useClientActiveAssignment.ts
import { useQuery } from '@tanstack/react-query';
import { findMyActiveAssignment } from '@/services/session.service';
import { useAuthStore } from '@/stores/authStore';

export function useClientActiveAssignment() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['myActiveAssignment', uid],
    queryFn: () => findMyActiveAssignment(uid!),
    enabled: !!uid,
    staleTime: 30_000,
  });
}
```

### TanStack Query v5 hook for duplicate guard

```typescript
// src/hooks/useTodaySession.ts
import { useQuery } from '@tanstack/react-query';
import { findTodaySession } from '@/services/session.service';
import { useAuthStore } from '@/stores/authStore';
import { localTodayString } from '@/lib/workoutDayComputer';

export function useTodaySession() {
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();
  return useQuery({
    queryKey: ['todaySession', uid, today],
    queryFn: () => findTodaySession(uid!, today),
    enabled: !!uid,
    staleTime: 5_000,
  });
}
```

### Finish mutation hook

```typescript
// src/hooks/useFinishSession.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createSession } from '@/services/session.service';
import { localTodayString } from '@/lib/workoutDayComputer';

export function useFinishSession() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();

  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', uid, today] });
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-av for video | expo-video | SDK 54 (removed in SDK 54, use expo-video ~55.0.17) | expo-av is removed from SDK 55 — cannot use |
| firebase JS SDK | @react-native-firebase v24 | Phase 1 decision | Different import paths; `exists()` is a method |
| Zustand v4 `shallow` | Zustand v5 `useShallow` hook | Phase 1 decision | `shallow` as `create` arg removed in v5 |
| Zod v3 `.url()` | Zod v4 `.url()` | Phase 2 discovery | Same method name; z.string().url() still works |
| RN `<Image>` | `expo-image` `<Image>` | Phase 2 install | Different import path; adds caching + contentFit |

**Deprecated / removed:**
- `expo-av`: Removed in SDK 54, use `expo-video` for video playback.
- `snap.exists` (property): RNFB v24 changed to `snap.exists()` (method) — reading as property returns a function reference (truthy), not a boolean.

---

## Firestore Index Audit

All indexes required by Phase 3 are already deployed:

| Query | Collection | Index Fields | Status |
|-------|------------|-------------|--------|
| `findMyActiveAssignment` | assignments | clientId ASC + status ASC | CONFIRMED — in firestore.indexes.json |
| `findTodaySession` (duplicate guard) | sessions | clientId ASC + date DESC | CONFIRMED — in firestore.indexes.json |

**No new Firestore indexes needed for Phase 3.**

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DST transition cannot cause a fractional-day error when both dates are local midnight | Pitfall 1 / Pattern 1 | Extremely low risk — floor absorbs ±1h; verified by MDN spec reasoning |
| A2 | iOS AsyncStorage non-persistence on force kill is mitigated by Zustand persist middleware's synchronous subscribe | Pitfall 2 | If iOS still loses the write, the resume prompt doesn't appear — user starts fresh, no data corruption |
| A3 | expo-video `~55.0.17` has the same `useVideoPlayer`/`VideoView` import API as the `~2.0.x` branch | Standard Stack | Low risk — both are from the expo/expo monorepo; only version differs |

**No user confirmation needed for any assumption before execution — all are low-risk with safe fallbacks.**

---

## Open Questions

1. **Celebration screen navigation depth**
   - What we know: on Finish, we want a summary/celebration screen.
   - What's unclear: should the celebration route be modal (Stack.Screen presentation='modal') or a regular push? A modal gives the "popup" feel and auto-dismisses to Home.
   - Recommendation: Use `presentation: 'modal'` in the workout Stack. The modal dismiss can then trigger `queryClient.invalidateQueries(['todaySession'])` to flip Home to the done state.

2. **Rest-day motivational message rotation strategy**
   - What we know: D-15 says "rotates from a small built-in set varies by date".
   - What's unclear: hash-by-date (deterministic, consistent across reopens) vs. random on each open?
   - Recommendation: `MESSAGES[parseDateOnly(today).getDay()]` — 7 messages keyed by weekday. Deterministic, no state needed, varies day-to-day.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `@react-native-async-storage/async-storage` | WORK-08 crash-safe state | ✓ | 2.2.0 (direct dep in package.json) | — |
| `expo-image` | WORK-03 image display | ✓ | ~55.0.11 | — |
| `expo-video` | WORK-03 video display | ✗ | NOT INSTALLED | Install via `npx expo install expo-video` then native rebuild |
| `zustand/middleware persist` | WORK-08 | ✓ | included in zustand@^5.0.14 | — |
| Firestore `sessions` index | WORK-09 duplicate guard | ✓ | (clientId+date) exists | — |
| Firestore `assignments` index | WORK-01..02 | ✓ | (clientId+status) exists | — |

**Missing dependencies with no fallback:**
- `expo-video`: requires `npx expo install expo-video` + native rebuild before any workout screen that contains video can be tested.

**Missing dependencies with fallback:**
- None beyond expo-video.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest-expo (react-native project) |
| Config file | `jest.config.js` — `projects[0]` (react-native preset) |
| Quick run command | `npx jest --testPathPattern="session\|workout\|variantResolver\|workoutDay" --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | `computeTodayWorkout` returns correct state for all 6 cases | unit | `npx jest workoutDayComputer` | ❌ Wave 0 |
| WORK-01 | `localTodayString` returns local date (not UTC) | unit | `npx jest workoutDayComputer` | ❌ Wave 0 |
| WORK-05 | `resolveVariant` returns correct exercise + modeTag for gym/home/both/no-alt cases | unit | `npx jest variantResolver` | ❌ Wave 0 |
| WORK-09 | `findTodaySession` returns null when no session, returns doc when exists | unit (mock firestore) | `npx jest session.service` | ❌ Wave 0 |
| WORK-08 | sessionStore clears stale date on open | unit (mock AsyncStorage) | `npx jest sessionStore` | ❌ Wave 0 |
| WORK-03/06/07 | workout execution screens render + finish mutation | component test (manual verify) | manual | n/a |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern="workoutDayComputer|variantResolver|session" --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/workoutDayComputer.test.ts` — covers WORK-01 (6 state cases + UTC-drift regression)
- [ ] `src/lib/__tests__/variantResolver.test.ts` — covers WORK-05 (gym/home/both/no-variant matrix)
- [ ] `src/services/__tests__/session.service.test.ts` — covers WORK-09 duplicate guard
- [ ] `src/stores/__tests__/sessionStore.test.ts` — covers WORK-08 hydration + stale-date clear

---

## Security Domain

`security_enforcement: true` in config.json, ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (auth already in Phase 1) | — |
| V3 Session Management | partial | Local session is ephemeral workout state — not auth session; AsyncStorage is unencrypted but non-sensitive |
| V4 Access Control | yes | Firestore rules: `isClient() && clientId == request.auth.uid` for session create/read; `assignments` read gated same way |
| V5 Input Validation | limited | No user-facing forms; session record fields are derived from snapshot (trainer-written) + checked IDs (exerciseId strings from snapshot). No free-text input. |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client writes session for another user | Spoofing | Firestore rule: `request.resource.data.clientId == request.auth.uid` enforced server-side |
| Client reads another user's session | Information Disclosure | Firestore rule: `resource.data.clientId == request.auth.uid` on read |
| Client reads assignment of another client | Information Disclosure | Firestore rule: `resource.data.clientId == request.auth.uid` on assignments read |
| AsyncStorage tampered via rooted device | Tampering | AsyncStorage is unencrypted — acceptable for workout progress (non-sensitive); auth tokens use expo-secure-store (Phase 1) |
| Duplicate session injection | Elevation of Privilege | Firestore does not enforce uniqueness; mitigated by client-side duplicate guard + `mutation.isPending` button disable |

**Security posture:** The server-side rules already enforce all ownership boundaries. No new rules are needed for Phase 3 — the sessions rule was written in Phase 2 in anticipation of this phase.

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 3 |
|-----------|-------------------|
| Expo SDK 55 + @react-native-firebase v24 | ✓ All Firestore calls use RNFB v24; `snap.exists()` method, not property |
| expo-router file-based routing | ✓ New screens under `src/app/client/workout/` |
| TanStack Query v5 single-object API | ✓ All `useQuery`/`useMutation` use `{ queryKey, queryFn }` object form |
| Zustand v5 — use `useShallow`, not `shallow` | ✓ sessionStore follows authStore pattern |
| react-hook-form + zod | Not needed — no user-input forms in Phase 3 |
| NativeWind v4 (Tailwind CSS v3) | ✓ Style all new components with NativeWind className |
| Obsidian Performance design: bg `#0E0E0E`, surface `#1A1A1A`, accent `#00FF66` | ✓ All cards/buttons use these tokens |
| `stripUndefinedDeep` before all Firestore writes | ✓ Used in `createSession()` |
| `usersCollection()` / `assignmentsCollection()` typed refs | ✓ New `sessionsCollection()` must be added to `src/firebase/firestore.ts` |
| RNFB v24: `snap.exists()` is a METHOD | ✓ All existence checks must call, not read property |
| zod v4 API — `z.enum([...] as const)`, not v3 patterns | ✓ If any session schema validation is added |
| GSD workflow enforcement — no direct edits outside GSD | ✓ Enforced via planning process |

---

## Sources

### Primary (HIGH confidence)
- `src/types/assignment.ts` — Assignment + AssignmentSnapshot types (read directly)
- `src/types/exercise.ts` — LocationType `'gym' | 'home' | 'both'` (read directly)
- `firestore.rules` — session create/update/read rules (read directly)
- `firestore.indexes.json` — confirmed existing indexes (read directly)
- `package.json` — confirmed installed packages and versions (read directly)
- `node_modules/expo/bundledNativeModules.json` — SDK 55 pinned versions: expo-video `~55.0.17`, async-storage `2.2.0`
- `node_modules/@react-native-async-storage/async-storage/lib/typescript/types.d.ts` — AsyncStorage API signatures
- `node_modules/zustand/middleware/persist.d.ts` — Zustand persist + createJSONStorage types
- `src/stores/authStore.ts` — Zustand v5 pattern with `useShallow` (reference implementation)

### Secondary (MEDIUM confidence)
- [CITED: https://docs.expo.dev/versions/latest/sdk/video/] — expo-video useVideoPlayer/VideoView API + Android one-player-per-view constraint
- [CITED: https://docs.expo.dev/versions/latest/sdk/image/] — expo-image Image props
- [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date] — Date-only strings parse as UTC; constructor with >1 arg uses local time
- [CITED: https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data] — createJSONStorage + AsyncStorage persist pattern

### Tertiary (LOW confidence — training data, not re-verified this session)
- Zustand v5 `partialize` option behavior (consistent with persist.d.ts — HIGH)
- iOS AsyncStorage force-kill non-persistence (known community issue — MEDIUM)

---

## Metadata

**Confidence breakdown:**
- Date-only math: HIGH — MDN spec verified; parseDateOnly pattern is authoritative
- AsyncStorage API: HIGH — read from installed node_modules type definitions
- Zustand persist: HIGH — read from installed node_modules; supplemented by official docs
- expo-video API: HIGH — official Expo docs; confirmed SDK 55 version from bundledNativeModules.json
- expo-image API: HIGH — official Expo docs; package confirmed installed
- Firestore rules / indexes: HIGH — read directly from files in repo
- Duplicate guard: HIGH — confirmed indexes exist; rules confirmed; RNFB v24 `.empty` pattern confirmed
- Gym/home variant logic: HIGH — type contracts read directly; pure function, no external deps
- Security: HIGH — rules read directly; ASVS assessment based on confirmed tech stack

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (stable stack — all packages confirmed in bundledNativeModules.json)
