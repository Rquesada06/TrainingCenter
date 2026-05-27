# Architecture Research: LauFit

**Domain:** Trainer-client fitness coaching mobile app
**Researched:** 2026-05-27
**Stack:** React Native (Expo SDK 51+) + Firebase (Auth, Firestore, Storage, Functions)
**Navigation:** expo-router with file-based routing
**Confidence:** HIGH (verified against official expo.dev and firebase.google.com docs)

---

## Recommended Structure

```
app/                          # expo-router file-based routes
  _layout.tsx                 # Root layout: auth guard + role-based split
  sign-in.tsx                 # Public auth screen (outside all groups)
  (trainer)/                  # Route group — trainer-only screens
    _layout.tsx               # Stack.Protected guard={role === "trainer"}
    (tabs)/                   # Trainer bottom tabs
      _layout.tsx
      index.tsx               # Dashboard: active clients + programs
      clients.tsx             # Client list
      library.tsx             # Exercise library
      profile.tsx             # Trainer profile
    clients/
      [clientId].tsx          # Client detail + assignment history
    exercises/
      [exerciseId].tsx        # Exercise detail/edit
      new.tsx
    routines/
      [routineId].tsx
      new.tsx
    programs/
      [programId].tsx
      new.tsx
    assign/
      [clientId].tsx          # Assign program flow

  (client)/                   # Route group — client-only screens
    _layout.tsx               # Stack.Protected guard={role === "client"}
    (tabs)/                   # Client bottom tabs
      _layout.tsx
      index.tsx               # Today's workout (calculated from assignment)
      history.tsx             # Past sessions
      profile.tsx             # Client profile
    workout/
      [sessionId].tsx         # Active session execution screen
      [sessionId]/
        exercise/[index].tsx  # Single exercise detail during session
    history/
      [sessionId].tsx         # Completed session review

src/
  firebase/
    config.ts                 # initializeApp, initializeFirestore with persistence
    auth.ts                   # onAuthStateChanged listener + sign-in helpers
    firestore.ts              # Typed collection references (typed converters)
    functions.ts              # httpsCallable wrappers
    storage.ts                # uploadBytes / getDownloadURL helpers

  hooks/
    useAuth.ts                # Current user + role from Firestore USERS doc
    useAssignment.ts          # Active assignment for current client
    useTodaysWorkout.ts       # Today's workout calculation (see Key Algorithms)
    useTrainerClients.ts      # Trainer's client list with real-time listener
    useExerciseLibrary.ts     # Trainer's exercise collection
    useSession.ts             # Session read/write (exercises + finalize)

  stores/
    authStore.ts              # Zustand: { uid, role, trainerId } — auth state
    sessionStore.ts           # Zustand: in-progress session state (offline-safe)

  services/
    assignment.service.ts     # createAssignment, snapshotProgram
    session.service.ts        # initSession, markExerciseDone, finalizeSession
    user.service.ts           # createClientAccount, updateProfile

  lib/
    workout-calculator.ts     # todaysWorkout() — pure function, testable
    timezone.ts               # UTC date arithmetic helpers
    firestore-converters.ts   # TypeScript withConverter definitions

  types/
    user.ts
    exercise.ts
    routine.ts
    program.ts
    assignment.ts
    session.ts

  components/
    trainer/                  # Trainer-specific UI components
    client/                   # Client-specific UI components
    shared/                   # Shared across roles (ExerciseCard, etc.)

  constants/
    theme.ts                  # Obsidian Performance colors, typography
```

**Key convention:** `src/` holds all non-route logic. `app/` is navigation only — no business logic lives in route files. Components, hooks, services, and types are all in `src/`.

---

## Role-Based Routing

### Pattern: Two Protected Route Groups in Root Layout

expo-router's `Stack.Protected` (introduced in recent SDK) is the clean solution. The root `_layout.tsx` reads the user's role from Zustand auth store (populated on sign-in from Firestore USERS doc) and guards each route group.

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const { isLoaded, uid, role } = useAuthStore();

  if (!isLoaded) return <SplashScreen />;

  return (
    <Stack>
      {/* Unauthenticated */}
      <Stack.Protected guard={!uid}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Trainer */}
      <Stack.Protected guard={!!uid && role === 'trainer'}>
        <Stack.Screen name="(trainer)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Client */}
      <Stack.Protected guard={!!uid && role === 'client'}>
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

### Loading Role Safely

Do NOT store role in the Firebase auth token custom claims for MVP. Custom claims require a Cloud Function on user creation and a token refresh cycle that adds complexity. Instead:

1. On auth state change (`onAuthStateChanged`), fetch `users/{uid}` from Firestore (one read, cheap).
2. Store `{ uid, role, trainerId }` in Zustand `authStore`.
3. Root layout reads from Zustand — no async in the layout itself.

```ts
// src/firebase/auth.ts
onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    useAuthStore.getState().clear();
    return;
  }
  const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
  const data = snap.data();
  useAuthStore.getState().set({
    uid: firebaseUser.uid,
    role: data?.role ?? null,
    trainerId: data?.trainerId ?? null,
    isLoaded: true,
  });
});
```

### Deep Links + Role Confusion

expo-router route groups are path-transparent — `/(trainer)/clients` renders at URL `/clients`. If a client somehow navigates to `/clients`, `Stack.Protected` with `guard={role === 'trainer'}` blocks access and falls back to the guard's anchor route. No custom redirect logic needed.

---

## Firestore Strategy

### Security Rules

Use a hybrid approach: rule functions that read the USERS doc for role checking. Keep rules in one place, referenced by all collections.

```firestore
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isTrainer() {
      return isSignedIn() && userDoc().role == 'trainer';
    }
    function isClient() {
      return isSignedIn() && userDoc().role == 'client';
    }
    function isMyTrainer(trainerId) {
      return isSignedIn() && userDoc().trainerId == trainerId;
    }

    // USERS — anyone reads own doc, trainer can create/update client docs
    match /users/{userId} {
      allow read: if isSignedIn() && request.auth.uid == userId;
      allow create: if isTrainer();   // trainer creates client accounts
      allow update: if isSignedIn() && request.auth.uid == userId; // self-update
    }

    // EXERCISES — trainer owns; clients cannot read (no direct access needed,
    // exercise data is snapshotted into ROUTINES already)
    match /exercises/{exerciseId} {
      allow read, write: if isTrainer() && resource.data.trainerId == request.auth.uid;
      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid;
    }

    // ROUTINES — trainer only
    match /routines/{routineId} {
      allow read, write: if isTrainer() && resource.data.trainerId == request.auth.uid;
      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid;
    }

    // PROGRAMS — trainer only
    match /programs/{programId} {
      allow read, write: if isTrainer() && resource.data.trainerId == request.auth.uid;
      allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid;
    }

    // ASSIGNMENTS — trainer creates; client reads own
    match /assignments/{assignmentId} {
      allow create, update: if isTrainer()
        && request.resource.data.trainerId == request.auth.uid;
      allow read: if isTrainer() && resource.data.trainerId == request.auth.uid
        || isClient() && resource.data.clientId == request.auth.uid;
    }

    // SESSIONS — client creates/updates own; trainer reads client's sessions
    match /sessions/{sessionId} {
      allow create, update: if isClient()
        && request.resource.data.clientId == request.auth.uid;
      allow read: if isClient() && resource.data.clientId == request.auth.uid
        || isTrainer() && isMyTrainer(resource.data.trainerId);
    }
  }
}
```

**Important:** Each `get()` call in rules costs a Firestore read. For EXERCISES, ROUTINES, PROGRAMS (trainer-only), use custom claims on token or denormalize `trainerId` into every document (already in the data model) so rules check `resource.data.trainerId == request.auth.uid` instead of a `get()` call. This is already done in the data model above.

The `get()` for `userDoc()` is only invoked for ASSIGNMENTS and SESSIONS where cross-role checks are necessary. This is acceptable for MVP scale.

### Real-Time Listeners vs One-Time Reads

| Data | Pattern | Rationale |
|------|---------|-----------|
| Today's assignment | `onSnapshot` | Trainer might update; client should see live |
| Exercise library | `onSnapshot` | Trainer actively editing while building |
| Active session in progress | Local Zustand store | Minimize writes mid-workout; commit on finalize |
| Session history | `getDocs` (one-time) | Read-only history, no need to listen |
| Trainer's client list | `onSnapshot` | Trainer dashboard needs live status |
| Program/routine detail | `getDoc` (one-time) | Read when building session; static |

### Data Access Patterns

- Trainer dashboard: `where('trainerId', '==', uid)` on ASSIGNMENTS + USERS
- Client today's workout: `where('clientId', '==', uid).where('status', '==', 'active')` on ASSIGNMENTS (returns one doc)
- Session history: `where('clientId', '==', uid).orderBy('completedAt', 'desc').limit(30)` on SESSIONS

**Index requirements:**
- `assignments`: composite index on `(clientId, status)`
- `sessions`: composite index on `(clientId, completedAt)`
- `assignments`: composite index on `(trainerId, status)` for trainer dashboard

---

## Key Algorithms

### Today's Workout Calculation

The core client algorithm. Must be timezone-safe — do not use `new Date()` and compute local midnight vs UTC. Use date-fns or dayjs with explicit timezone to compute day offset.

```ts
// src/lib/workout-calculator.ts
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface WorkoutResult {
  dayNumber: number;       // 1-indexed day in program
  routine: EmbeddedRoutine | null; // null = rest day
  isComplete: boolean;
  weekNumber: number;
}

/**
 * Pure function — fully testable, no Firestore dependency.
 * @param assignment  Active ASSIGNMENT document
 * @param userTimezone  IANA timezone string, e.g. "America/New_York"
 * @param nowUtc  Current UTC timestamp (pass Date.now() from caller, injectable for tests)
 */
export function getTodaysWorkout(
  assignment: Assignment,
  userTimezone: string,
  nowUtc: number = Date.now()
): WorkoutResult | null {
  // Convert both dates to user's local calendar day
  const startDateLocal = toZonedTime(parseISO(assignment.startDate), userTimezone);
  const todayLocal = toZonedTime(new Date(nowUtc), userTimezone);

  // Calendar-day difference: ignores DST hour shifts
  const dayOffset = differenceInCalendarDays(
    startOfDay(todayLocal),
    startOfDay(startDateLocal)
  );

  if (dayOffset < 0) return null; // Program hasn't started yet

  const programDays = assignment.programSnapshot.days;
  const totalDays = programDays.length;

  if (dayOffset >= totalDays) return null; // Program has ended

  const programDay = programDays[dayOffset]; // 0-indexed into days array

  return {
    dayNumber: dayOffset + 1,
    weekNumber: Math.floor(dayOffset / 7) + 1,
    routine: programDay.isRestDay ? null : programDay.routine,
    isComplete: false, // caller checks sessions collection for completion
  };
}
```

**Why `differenceInCalendarDays` not millisecond math:**
Millisecond math (`(now - start) / 86400000`) breaks across DST transitions (23 or 25-hour days). `differenceInCalendarDays` from date-fns uses calendar dates, not clock duration.

**Timezone source:** Store `timezone` on the USERS doc (set on first login using `Intl.DateTimeFormat().resolvedOptions().timeZone`). Pass it into this function. Do not use the device timezone at render time without storing it — it can change.

**Session completion check:** After computing `dayNumber`, query SESSIONS for `(clientId == uid AND assignmentId == assignment.id AND dayNumber == dayNumber)`. If a doc exists and `status == 'completed'`, today is done.

### Session State Machine

A session has these states in the SESSIONS collection:

```
not_started → in_progress → completed
```

```
not_started:  no SESSIONS doc exists for this dayNumber + assignmentId
in_progress:  doc exists with status: 'in_progress'
completed:    doc exists with status: 'completed'
```

**State transitions live in `src/services/session.service.ts`:**

```ts
// initSession: called when client taps "Start Workout"
// Creates the SESSIONS doc with status: 'in_progress'
async function initSession(assignment, dayNumber, routine): Promise<string>

// markExerciseDone: called when client checks off an exercise
// Only writes to LOCAL Zustand store — no Firestore write mid-workout
function markExerciseDone(exerciseIndex: number, setsCompleted: number): void

// finalizeSession: called when client taps "Finish Workout"
// Writes completedExercises[] and status: 'completed' to Firestore
async function finalizeSession(sessionId: string, store: SessionStore): Promise<void>
```

---

## Session Write Strategy: Finalize-Only (Not Real-Time)

**Decision: Write session data only on finalize, not after each exercise.**

Rationale:
1. A fitness session takes 30–60 minutes. Writing after each exercise creates 10–20 Firestore writes per session. At scale, this is expensive.
2. If connectivity drops mid-session, in-flight writes will queue in Firestore's offline cache — but Firestore's offline queue is not durable across app kills. If the user kills the app during a set, queued writes are lost.
3. The correct offline pattern is: keep in-progress state in Zustand (RAM + AsyncStorage backup), and commit once on finalize.

**Offline safety for the finalize write:**
- On "Finish Workout" tap, attempt the Firestore write.
- If offline, Firestore queues the write internally (persistence is enabled — see Offline Considerations).
- Show the user a "Saved" state regardless — the Firestore SDK guarantees delivery when connectivity returns.
- Do NOT block the UI on write confirmation for the finalize — optimistic update immediately.

**AsyncStorage backup for crash recovery:**
```ts
// On every markExerciseDone, also write to AsyncStorage under key "session-draft"
// On app open, check AsyncStorage for an unfinished session and offer to resume
```

This two-layer strategy (Zustand for runtime, AsyncStorage for crash recovery, Firestore for persistence) is the right approach for mobile workout tracking.

---

## Firebase Functions Scope

Keep the client-side JavaScript surface large. Functions are for operations that require trust or cannot be done safely client-side.

| Operation | Where | Reason |
|-----------|-------|--------|
| Sign in | Client (Firebase Auth SDK) | Standard auth flow |
| Create exercise / routine / program | Client (Firestore SDK) | Simple CRUD, secured by rules |
| Assign program to client | Client (Firestore SDK) | Snapshot copy at write time — client code can do this |
| Mark exercise complete | Client (Zustand store only) | No Firestore write until finalize |
| Finalize session | Client (Firestore SDK, batch write) | Single atomic write, rules enforce clientId |
| Create client account | **Cloud Function** | Trainer must create a Firebase Auth user for the client — requires Admin SDK (client SDK cannot create other users) |
| Set user role (`users/{uid}` doc creation) | **Cloud Function** | Called from `createClientAccount` function — ensures role is set by server, not by client self-reporting |
| Send welcome email to new client | **Cloud Function** | Auth trigger on user creation |
| Validate program structure on assignment | Client-side with Zod | Schema validation before write; no server needed |
| Aggregate session stats | **Cloud Function** (Phase 2+) | Expensive reads; defer to post-MVP |

**The one mandatory Cloud Function for MVP:** `createClientAccount`

```ts
// functions/src/createClientAccount.ts
// Called by trainer client-side via httpsCallable
export const createClientAccount = functions.https.onCall(async (data, context) => {
  // Verify caller is a trainer
  const callerDoc = await admin.firestore().doc(`users/${context.auth?.uid}`).get();
  if (callerDoc.data()?.role !== 'trainer') throw new functions.https.HttpsError('permission-denied', '...');

  // Create Firebase Auth user
  const userRecord = await admin.auth().createUser({
    email: data.email,
    password: data.temporaryPassword,
    displayName: data.name,
  });

  // Create USERS doc with role: 'client' and trainerId reference
  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    role: 'client',
    trainerId: context.auth?.uid,
    name: data.name,
    email: data.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid: userRecord.uid };
});
```

---

## Offline Considerations

### React Native Firebase vs Firebase JS SDK

This project uses Expo with development builds (required for `@react-native-firebase/*`). The react-native-firebase SDK uses native iOS/Android Firebase SDKs under the hood. **Offline persistence is enabled by default** on iOS and Android with react-native-firebase — no configuration needed.

This is a key difference from the web SDK, where persistence must be explicitly enabled.

```ts
// src/firebase/config.ts — with react-native-firebase
// Offline persistence is ON by default. Optionally disable it:
import firestore from '@react-native-firebase/firestore';

// Only call this BEFORE any other Firestore usage
// Default is persistence: true — don't change it for LauFit
await firestore().settings({ persistence: true });
```

If the project uses the Firebase JS SDK (via `firebase/app`) instead of `@react-native-firebase`, persistence requires explicit initialization:

```ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
initializeFirestore(app, { localCache: persistentLocalCache({}) });
```

**Recommendation:** Use `@react-native-firebase` (native SDK) — better offline reliability, better performance, persistence by default.

### Offline-Safe Session Execution Flow

```
App launched
  └─ Load assignment via onSnapshot (cached if offline)
  └─ Compute today's workout from cached assignment

Client taps "Start Workout"
  └─ initSession() writes {status: 'in_progress'} to Firestore
       └─ If offline: write queued in Firestore offline cache
       └─ Session doc ID stored in Zustand + AsyncStorage

Client marks exercises complete
  └─ NO Firestore writes — state held in Zustand only
  └─ AsyncStorage updated as backup on each mark

Client taps "Finish Workout"
  └─ finalizeSession() writes batch: {completedExercises, status: 'completed'}
       └─ If offline: batch queued; Firestore SDK delivers when online
       └─ UI immediately shows "Workout Complete" (optimistic)
       └─ AsyncStorage "session-draft" cleared

App killed mid-workout (crash recovery)
  └─ On next app open, check AsyncStorage for "session-draft"
  └─ If found + Firestore shows status: 'in_progress', offer "Resume Workout"
  └─ Restore Zustand state from AsyncStorage snapshot
```

### What Must Be Cached Locally

For offline workout execution to work, the following must have been fetched (and cached by Firestore) during a previous online session:

- Active ASSIGNMENT doc (including full `programSnapshot` with routines + exercises)
- USERS doc for current user (for timezone + profile)

The ASSIGNMENT doc contains the full program snapshot with embedded routines. Since all workout data for execution is in that single document, offline workout execution requires only that one doc to be present in cache.

**Pre-fetch strategy:** On app open while online, immediately load the active assignment with `onSnapshot`. Firestore caches it. The client can then kill WiFi and still execute their workout.

---

## Build Order

Component dependencies determine build order. Each phase should leave the app in a working state.

```
1. Firebase foundation
   ├── Firebase project setup (Auth, Firestore, Storage, Functions)
   ├── react-native-firebase integration + Expo dev build
   ├── Firestore security rules (permissive for dev, restrictive for prod)
   └── authStore (Zustand) + onAuthStateChanged listener

2. Role-based navigation shell
   ├── Root _layout.tsx with Stack.Protected role guards
   ├── sign-in.tsx screen
   ├── (trainer)/_layout.tsx with tabs
   ├── (client)/_layout.tsx with tabs
   └── Role redirect logic verified end-to-end

3. Trainer content creation (no clients yet)
   ├── Exercise CRUD (list, create, edit, delete)
   ├── Routine builder (select from exercise library, reorder)
   └── Program builder (assign routines to days, mark rest days)

4. Client management + assignment
   ├── createClientAccount Cloud Function
   ├── Client list screen (trainer)
   ├── Assign program flow (trainer → client + start date)
   └── Assignment snapshot logic

5. Client workout execution
   ├── useTodaysWorkout hook + workout-calculator.ts (with tests)
   ├── Today's workout screen (client index tab)
   ├── Exercise detail screen
   ├── Session execution screen (Zustand session store)
   ├── finalizeSession service + batch write
   └── Offline safety (AsyncStorage draft + resume flow)

6. Session history
   ├── Client session history list
   └── Trainer view of client sessions

7. Profiles + polish
   ├── Client profile (name, photo via Firebase Storage)
   ├── Trainer profile
   └── Gym/home variant toggle (alternativeExerciseId lookup)
```

**Critical path:** Steps 1-2 are purely infrastructure. No user-facing value until step 3. Steps 3-5 are the core value loop (trainer programs → client executes). Build steps 1-5 before shipping to Lau for validation.

---

## Sources

- expo-router Stack.Protected and route groups: https://docs.expo.dev/router/advanced/authentication
- expo-router protected routes: https://docs.expo.dev/router/advanced/protected
- Firestore role-based security rules: https://firebase.google.com/docs/firestore/solutions/role-based-access
- Firestore custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firestore offline persistence (React Native Firebase): https://rnfirebase.io/firestore/usage
- React Native Firebase Expo setup: https://rnfirebase.io/
- Firestore transactions and batch writes: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore offline enable: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Cloud Functions for Firebase: https://firebase.google.com/docs/firestore/extend-with-functions
