# Pitfalls Research: LauFit

**Domain:** React Native fitness coaching app (Expo + Firebase)
**Researched:** 2026-05-27
**Overall confidence:** HIGH — all critical findings verified against official Expo docs, Firebase docs, and react-native-firebase source

---

## Critical Pitfalls (Show Stoppers)

### 1. Auth State Race Condition — Flash of Wrong Screen

**What goes wrong:** Firebase Auth's `onAuthStateChanged` is asynchronous. On cold start, the auth state is `null` for 200–800ms while the SDK initializes. If the app renders navigation before that promise resolves, `null` user triggers an immediate redirect to `/login`, which visibly flashes before the actual authenticated state loads and redirects back to the home screen.

**Warning Signs:**
- Users report seeing the login screen for a split second on every app open
- Navigation stack corruption (back button goes to login after app is already authenticated)
- `useRouter().replace()` fires twice in quick succession in logs

**Prevention Strategy:**
Maintain a dedicated `initializing` boolean state. While `initializing === true`, render a splash/loading screen — not `null`, not a redirect. Only mount the navigation guard after Firebase has fired its first auth event.

```tsx
// Pattern from official react-native-firebase docs
const [initializing, setInitializing] = useState(true);
const [user, setUser] = useState(null);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    setUser(firebaseUser);
    if (initializing) setInitializing(false);
  });
  return unsubscribe;
}, []);

if (initializing) return <SplashScreen />;
```

With expo-router, gate the root `_layout.tsx` on `initializing` using `Stack.Protected` or a `Redirect` inside a `useEffect`-driven state — never directly from the raw Firebase user without the initializing guard.

**Which Phase:** Phase 1 (Authentication) — foundational, must be solved before any navigation can be trusted.

---

### 2. "Today's Workout" Off-By-One — Timezone Bug

**What goes wrong:** Firestore stores timestamps as UTC. A program assignment has a `startDate`. "Day N" is calculated as `Math.floor((now - startDate) / 86400000)`. When a user in UTC-5 opens the app at 11pm, `new Date()` gives one UTC date; the assignment `startDate` was stored as midnight UTC on the trainer's timezone. The day offset is wrong by exactly 1, showing tomorrow's workout or yesterday's.

A subtler variant: `startDate` is stored as a Firestore Timestamp but the client computes with `new Date().toISOString().split('T')[0]` which is always UTC, while the user expects "today" in their local timezone. A trainer in Buenos Aires (UTC-3) and client in Madrid (UTC+2) will compute different "today" values from the same timestamp.

**Warning Signs:**
- Beta testers report wrong workout on workout day boundaries (around midnight)
- "Day 1" sometimes shows as rest day
- Inconsistency between trainer dashboard and client view of the same program day

**Prevention Strategy:**
Never compute the workout day index with raw millisecond arithmetic on UTC timestamps. Use a date-only string (`YYYY-MM-DD`) stored in Firestore as the canonical `startDate`, computed from the **client's local timezone at time of assignment**. Day index becomes string comparison — no timezone math:

```ts
// Store on assignment
const today = new Date();
const startDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

// Read on client
function getTodayLocalString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dayIndex(startDate: string, today: string): number {
  const msPerDay = 86400000;
  const start = new Date(startDate + 'T00:00:00'); // local midnight
  const now = new Date(today + 'T00:00:00');
  return Math.floor((now.getTime() - start.getTime()) / msPerDay);
}
```

Additionally, the workout screen must re-evaluate "today" when the app comes back from background (AppState change event), since a user who leaves the app open overnight will otherwise see yesterday's workout until they force-kill.

**Which Phase:** Phase 2 (Program Assignment + Client Home Screen) — must be correct from first client-facing build.

---

### 3. Firestore Listener Leak — Memory Accumulation During Workout

**What goes wrong:** The session execution screen subscribes to a Firestore real-time listener (the project uses real-time writes to avoid data loss). If the listener unsubscribe function is not called on component unmount, the listener continues firing callbacks after the screen is gone. In a React Native app this causes state updates on unmounted components (React warning), steadily increasing memory, and duplicate writes if the user navigates back into the same screen.

With expo-router, navigating between screens does not always unmount the previous screen component (depending on stack vs. tabs layout). This makes the leak harder to detect in development.

**Warning Signs:**
- "Can't perform a React state update on an unmounted component" warnings during workout flows
- Memory usage climbs across multiple workout sessions in a single app session
- Duplicate session documents in Firestore

**Prevention Strategy:**
Every `onSnapshot()` call must store the returned unsubscribe function and call it in the `useEffect` cleanup. Use a custom hook:

```ts
function useSessionListener(sessionId: string) {
  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = onSnapshot(doc(db, 'sessions', sessionId), handler);
    return () => unsubscribe(); // called on unmount
  }, [sessionId]);
}
```

Never subscribe in event handlers or outside `useEffect`. Audit every `onSnapshot`, `onAuthStateChanged`, and `collection().onSnapshot()` call in the codebase before releasing.

**Which Phase:** Phase 3 (Session Execution) — highest risk phase, where most listeners live.

---

### 4. Snapshot-on-Assignment Not Deep-Copied

**What goes wrong:** The program snapshot decision (immutable copy on assignment) is correct but the implementation can silently fail. If the assignment document merely stores a `programId` reference instead of copying all program data, any edit to the program breaks active assignments. Conversely, if the copy is a shallow clone of the program document but exercises are stored by reference (`exerciseId` array), edits to exercises in the library still affect active snapshots.

**Warning Signs:**
- Client sees a different exercise than the trainer intended after trainer edits their library
- Test: edit an exercise after assigning a program — client should still see original values
- Sessions log the wrong exercise name in history

**Prevention Strategy:**
The snapshot must be a complete, self-contained copy. At assignment time, resolve all `exerciseId` references and embed the full exercise objects (name, sets, reps, instructions, videoUrl, `alternativeExerciseId` resolution) into the snapshot document. The snapshot must contain no foreign key references to mutable library documents. Write a Cloud Function or client-side transaction that reads the full exercise objects and embeds them before writing the ASSIGNMENTS document.

**Which Phase:** Phase 2 (Program Assignment) — the architectural decision is correct, but the implementation must be enforced with a transaction.

---

### 5. Firestore Security Rules Left Open (Default Allow All)

**What goes wrong:** Firebase projects default to open read/write rules for a short testing period, and developers under deadline ship to production before updating them. Any authenticated user can read all clients' session data, all programs, all user profiles. This is a GDPR/privacy violation and a data integrity risk (clients can write to other clients' sessions).

**Warning Signs:**
- Firebase console shows "Your Cloud Firestore security rules are currently open to all authenticated users" warning
- No role field checked in any security rule

**Prevention Strategy:**
Write rules before writing application code. The minimal correct baseline for LauFit:

```firestore
service cloud.firestore {
  match /databases/{database}/documents {
    function isTrainer() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer';
    }
    function isOwner(uid) {
      return request.auth.uid == uid;
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isTrainer();
      allow write: if isOwner(userId);
      allow create: if isTrainer(); // trainer creates client accounts
    }
    match /sessions/{sessionId} {
      allow read: if isOwner(resource.data.clientId) || isTrainer();
      allow write: if isOwner(resource.data.clientId);
    }
    match /assignments/{assignmentId} {
      allow read: if isOwner(resource.data.clientId) || isTrainer();
      allow write: if isTrainer();
    }
    // ... etc
  }
}
```

Deploy rules with every backend change via `firebase deploy --only firestore:rules`. Never ship with default open rules.

**Which Phase:** Phase 1 — set up before writing any data.

---

## Performance Pitfalls

### 1. Workout Timer Causing Cascade Re-Renders

**What goes wrong:** A rest timer on the workout execution screen runs every second via `setInterval`. If the timer state lives in a parent component that also renders the exercise list (sets, reps, completion checkboxes), every tick causes the entire workout screen to re-render — including the exercise FlatList, which is expensive with 10–20 exercises each having their own state.

**Warning Signs:**
- Noticeable frame drops (below 60 fps) during rest timer countdown
- React DevTools Profiler shows full tree re-rendering every second
- Timer animation jank on mid-range Android devices

**Prevention Strategy:**
Isolate the timer into its own component with its own local state. The timer counter must never live in the same state atom that drives the exercise list rendering. Use `React.memo` on exercise row components and `useCallback` on completion handlers to prevent referential inequality from causing re-renders. For a smooth countdown animation, use `react-native-reanimated`'s `useSharedValue` for the timer display — it runs on the UI thread and does not trigger React re-renders at all.

```ts
// Timer state isolated — doesn't cause exercise list re-renders
function RestTimer({ duration }: { duration: number }) {
  const countdown = useSharedValue(duration);
  // runs on UI thread, zero JS re-renders
  useAnimatedReaction(
    () => countdown.value,
    (v) => { if (v <= 0) runOnJS(onTimerEnd)(); }
  );
}
```

**Which Phase:** Phase 3 (Session Execution).

---

### 2. Unbounded Firestore Query on Session History

**What goes wrong:** `db.collection('sessions').where('clientId', '==', uid)` with no `limit()` fetches every session ever recorded for a client. A client with 6 months of daily sessions will fetch 180+ documents on every history screen open. This is slow, burns read quota, and degrades as the user continues training.

**Warning Signs:**
- Session history screen has noticeably longer load time for power users
- Firebase console shows unusually high read counts from history screens
- Firestore billing spikes after 3+ months of active use

**Prevention Strategy:**
Always paginate session history. Use `orderBy('date', 'desc').limit(20)` for the initial fetch, then cursor-based pagination with `startAfter(lastDoc)` for "load more". Cache the results in React Query with a long `staleTime` since historical sessions are immutable once finalized.

```ts
const q = query(
  collection(db, 'sessions'),
  where('clientId', '==', uid),
  orderBy('date', 'desc'),
  limit(20)
);
```

Also create the composite index `(clientId ASC, date DESC)` explicitly — Firestore will error without it and the error message in production logs is cryptic.

**Which Phase:** Phase 4 (History/Dashboard).

---

### 3. Missing Composite Indexes Crashing Queries in Production

**What goes wrong:** Firestore requires explicit composite indexes for any query that filters on one field and orders by another (or filters on multiple fields). The error is a runtime crash with a long error message containing a URL to create the index in the console. In development, developers often click the link and create it manually. In production, the query silently returns empty or throws an exception that is not caught.

**Warning Signs:**
- Screens that work in development return empty data in production (different Firestore project)
- "The query requires an index" errors in Crashlytics
- Trainer dashboard shows no active clients despite data existing

**Prevention Strategy:**
Run all production-representative queries against the staging Firestore project early and capture the generated `firestore.indexes.json`. Commit this file to source control and deploy it with `firebase deploy --only firestore:indexes`. Never rely on the manual "click to create" link — it only creates the index in the current project.

Specifically for LauFit, anticipate these required composite indexes:
- `sessions`: `(clientId ASC, date DESC)` — history query
- `assignments`: `(clientId ASC, status ASC)` — "find active assignment for client"
- `assignments`: `(trainerId ASC, status ASC)` — trainer dashboard query

**Which Phase:** Phase 2–4, but define the index file in Phase 1 setup.

---

### 4. Firestore Timestamp Hot Spot on Sequential Session Writes

**What goes wrong:** Sessions written with a Firestore server timestamp (`serverTimestamp()`) as the primary sort field create a sequential index where all new entries land on the same Firestore storage tablet. Firebase documentation explicitly warns that sequential timestamps in indexed fields create a write hot spot that causes latency increases above ~500 writes/second per tablet. For a single trainer with 10 clients doing daily sessions this is not a scaling concern today, but using `orderBy('createdAt')` as the only sort strategy locks in a pattern that degrades as the trainer base grows.

**Warning Signs:**
- Gradually increasing write latency as the app gains users (not obvious until scale)
- Firestore performance tab shows write times increasing over time

**Prevention Strategy:**
For session history sorting, use the date string (`YYYY-MM-DD`) as the sort field rather than a millisecond timestamp. This distributes writes by day across index entries, which is a coarser granularity. Reserve `serverTimestamp()` for audit fields but do not index it. This is low-urgency for a single-trainer MVP but the data model should not bake in a hot spot.

**Which Phase:** Phase 1 (Data model) — cheap to get right at the start.

---

### 5. Exercise Reorder Gesture Conflict with ScrollView

**What goes wrong:** `react-native-draggable-flatlist` (the standard solution for reorderable exercise lists) requires `react-native-gesture-handler` and `react-native-reanimated`. When the draggable list lives inside a `ScrollView`, pan gesture events are ambiguous — the scroll handler and the drag handler compete. On Android this manifests as the drag gesture being hijacked by scroll, making reordering unreliable. On iOS the conflict is less severe but still present.

Additionally, `DraggableFlatList` requires `GestureHandlerRootView` to wrap the entire app — not just the screen — or gestures silently fail. This is a global setup step that is easy to miss.

**Warning Signs:**
- Drag initiation works sometimes but not consistently on Android
- Long-press triggers drag on iOS but not Android (or vice versa)
- Reorder works in Expo Go but not in a development build

**Prevention Strategy:**
Never nest `DraggableFlatList` inside a `ScrollView`. The list itself handles scrolling. Wrap the root `_layout.tsx` with `GestureHandlerRootView` at the very top level. Use `onLongPress` (not `onPress`) to initiate drag — this gives the tap recognizer time to decide it's a drag and not a scroll.

```tsx
// In root _layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack />
    </GestureHandlerRootView>
  );
}
```

**Which Phase:** Phase 2 (Program Builder — exercise ordering).

---

### 6. FlatList `renderItem` Not Memoized — Exercise List Re-Renders

**What goes wrong:** If `renderItem` is defined inline in the component body (not wrapped in `useCallback`), every parent state change recreates the function reference, causing React Native's `FlatList` to re-render every visible item even when the data hasn't changed. On the workout execution screen where timer state lives in the same component, this fires every second.

**Warning Signs:**
- Profiler shows all FlatList items re-rendering on timer ticks
- Jank on scroll during active workout

**Prevention Strategy:**
Always wrap `renderItem` in `useCallback` and wrap item components in `React.memo`. Pass only the minimum props needed by each item — avoid spreading the entire workout state into every row.

**Which Phase:** Phase 3 (Session Execution).

---

## Security Pitfalls

### 1. Client Can Write to Another Client's Session

**Prevention Strategy:** Every session document must include `clientId: request.auth.uid` set by the client at creation time, and the security rule must verify `request.auth.uid == resource.data.clientId` on all writes. Never use `allow write: if request.auth != null` without scoping to owner. The Firestore `request.resource.data` check (on creates) must also validate that the `clientId` being set matches the authenticated user, preventing a client from creating a session attributed to a different user.

---

### 2. Trainer Role Elevation via Client Self-Write

**Prevention Strategy:** The `role` field in USERS documents must never be writable by the user themselves. A client who can write their own profile document could set `role: 'trainer'` and gain access to all trainer-scoped data. Security rules must explicitly deny writes to the `role` field from the document owner:

```firestore
allow update: if isOwner(userId)
  && !('role' in request.resource.data.diff(resource.data).affectedKeys());
```

Role assignment must only be possible by an admin (server-side via Cloud Function or Firebase Admin SDK), not by any client-authenticated write.

---

### 3. google-services.json and GoogleService-Info.plist Committed to Git

**Prevention Strategy:** These files contain API keys and project identifiers. While Firebase security is enforced at the rules layer (not by keeping these files secret), committing them to a public repo exposes the project ID to scraping and abuse of Firebase quota. Store them as EAS secret file variables (`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST`) uploaded via `eas secret:create`. Add both files to `.gitignore` immediately at project setup. Provide a local fallback path in `app.config.js` for developer machines:

```js
android: {
  googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
}
```

---

### 4. Firebase Storage Rules Allow Unauthenticated Reads of Profile Photos

**Prevention Strategy:** The default Storage rules allow `read` to all authenticated users — meaning any client can read any other client's profile photo if they know the path. For a trainer-client app, profile photos should only be readable by the photo owner and their assigned trainer. Minimum viable rule:

```firestore
match /users/{userId}/profile/{filename} {
  allow read: if request.auth.uid == userId || isTrainer();
  allow write: if request.auth.uid == userId;
}
```

---

### 5. Firestore Rules Use `get()` in a Hot Loop

**Prevention Strategy:** Using `get()` inside Firestore security rules (to look up a user's role from the USERS collection) counts as a billable read **per rule evaluation**. If a screen opens 20 Firestore listeners simultaneously (trainer dashboard), each listener evaluation calls `get()` on the USERS doc, multiplying reads by 20x. Mitigate by embedding the role directly in the Firebase Auth custom claims (set via Admin SDK in a Cloud Function on account creation) and reading from `request.auth.token.role` instead of calling `get()`. This is zero-cost and faster.

---

## UX/Adoption Pitfalls

### 1. Trainer Friction in Program Creation Kills Adoption

**What causes churn:** The core value proposition is "assign a program in under 3 minutes." If program creation requires the trainer to navigate 5+ screens, re-enter exercise details they've already entered elsewhere, or wait for slow Firestore writes, they stop using the app within the first week. LauFit's exercise library approach (define once, reuse) is correct — the pitfall is if the library search or routine builder UX has any latency or friction.

**Prevention:** The program builder must be a single-screen flow with inline search-and-add. Exercise search must be instant (local filter over pre-fetched library, not a Firestore query on every keystroke). Save operations must be optimistic — update local state immediately and sync to Firestore in the background, so the trainer never waits.

---

### 2. Client Confusion on Rest Days

**What causes churn:** A client opens the app on a rest day and sees nothing, no explanation, no encouragement. They assume the app is broken or their program wasn't assigned correctly. First-time users who hit a rest day before they've seen a real workout day churn immediately.

**Prevention:** The "today's workout" screen must have a distinct, positive rest day state — not an empty screen. Show the rest day explicitly, show the next workout day (and which day it is), and optionally show a motivational message. This is a one-screen design decision but it has outsized impact on first-week retention.

---

### 3. Program Not Started Yet — Confusing Blank State

**What causes churn:** If `startDate` is in the future (trainer assigns a program starting next Monday), the client opens the app and sees nothing. Same blank state problem as rest days, different cause.

**Prevention:** Distinguish three states explicitly in the client home screen: (a) no assignment, (b) assignment starts in N days, (c) rest day, (d) active workout. Each needs a different screen design. Never show a blank/empty state without a clear explanation.

---

### 4. Video Playback UX — External Links Feel Broken

**What causes churn:** Using YouTube/Vimeo links (as decided) means tapping a video exits the app, opens the browser or YouTube app, plays the video, then the user has to manually navigate back. On Android this often loses the workout state if the app was backgrounded. Users stop tapping video links and feel they're getting less guidance than expected.

**Prevention:** Use `expo-video` or `expo-web-browser` with `WebBrowser.openBrowserAsync()` to open videos in an in-app browser sheet that dismisses back to the app automatically. Never use `Linking.openURL` for video links — it exits the app. This is not a massive engineering effort but must be decided before Phase 3.

---

### 5. Gym/Home Toggle Not Discoverable

**What causes churn:** The `alternativeExerciseId` gym/home toggle feature adds significant value but only if clients know it exists. If the toggle is a small icon or hidden in a menu, power users never discover it and the feature goes unused, which means the trainer doesn't see adoption of the feature they set up and considers the app incomplete.

**Prevention:** The toggle must be a first-class UI element visible on every exercise card that has an alternative. A tab strip or pill toggle ("Gym / Home") is clear. Put a one-time tooltip on first encounter. Track toggle usage in analytics to validate adoption.

---

### 6. Onboarding Flow Missing for First Client

**What causes churn:** A trainer sends an invite link to their first client. The client installs the app, sees an email/password login screen, creates an account, and then sees... nothing, because the trainer hasn't associated the account with an assignment yet (or the association flow isn't built yet). The client abandons within 5 minutes.

**Prevention:** The client onboarding flow needs to be defined before the first real client is invited. Options: (a) trainer creates the client account on their behalf (simpler for MVP — trainer controls the email/password and shares it), or (b) client self-registers and trainer links via UID or email. For MVP with one trainer, option (a) removes the orphaned-account problem entirely. Document the chosen flow as a decision in PROJECT.md.

---

## Build and Deployment Pitfalls

### 1. React Native Firebase Requires Custom Native Code — Incompatible with Expo Go

**What goes wrong:** `@react-native-firebase/app` and related modules require native code (gradle plugins on Android, CocoaPods on iOS). Expo Go does not support custom native modules. A developer who starts coding using Expo Go for iteration will build features that appear to work, then find that the entire Firebase integration is silently broken or causes a crash when switching to a development build or production build.

**Prevention Strategy:** Set up the development build (`expo-dev-client` + `eas build --profile development`) on day one, before writing any Firebase code. Add explicit documentation in the project README: "Do not use Expo Go for this project." The `@react-native-firebase` config plugin (added to `app.config.js` plugins array) must be installed and the first EAS development build must succeed before any feature work begins.

---

### 2. Google Services Config Files Not Uploaded to EAS

**What goes wrong:** `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are git-ignored for security. EAS Build runs in a clean environment without these files unless they are explicitly uploaded as EAS secret file variables. The build will succeed (the files are optional at build time in some configurations) but the app will crash at runtime when Firebase initializes because the config is missing.

**Warning Signs:**
- EAS Build succeeds but the app crashes on launch with a Firebase initialization error
- "No app has been created — call Firebase.initializeApp()" at runtime

**Prevention Strategy:**
Upload both files via EAS CLI before the first production build:

```sh
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
```

Reference them in `app.config.js`:
```js
android: { googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json' },
ios: { googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist' }
```

---

### 3. Hermes + JavaScript Syntax Errors Are Silent at Dev Time

**What goes wrong:** EAS production builds use Hermes (the Meta JS engine). Hermes does not support all JavaScript syntax that V8 (used in development) supports. Optional chaining, nullish coalescing, and modern syntax generally work — but there are edge cases with certain Babel transforms and library-internal code that throws a Hermes parse error only at production build time (or at runtime on device), not during `expo start`.

**Warning Signs:**
- Build succeeds but app crashes immediately on real device (production)
- Error is a JavaScript syntax error deep in a third-party library's compiled output

**Prevention Strategy:**
Enable Hermes in development builds too — do not disable it as a workaround. Add `"hermesEnabled": true` to `gradle.properties` for Android. Test all builds on real devices, not just the simulator. When a library causes Hermes issues, pin its version and file a bug upstream rather than disabling Hermes globally.

---

### 4. SDK Version Mismatch After Partial Upgrade

**What goes wrong:** Running `npm install expo@^52` without running `npx expo install --fix` leaves transitive dependencies (react-native, react, expo-status-bar, etc.) at incompatible versions. The mismatch is not always immediately obvious — some features work, others crash or produce incorrect behavior on specific devices.

**Warning Signs:**
- `npx expo-doctor` reports version mismatches
- Specific screen crashes only on Android 12+ or iOS 16+
- Build warnings about peer dependency conflicts

**Prevention Strategy:**
Always use `npx expo install --fix` after any SDK version change. Run `npx expo-doctor` as part of CI. Pin the exact Expo SDK version in `package.json` (`"expo": "~51.0.0"` not `"^51.0.0"`) to prevent accidental minor bumps.

---

### 5. iOS App Store Submission Failing Due to Privacy Manifest

**What goes wrong:** Apple requires a `PrivacyInfo.xcprivacy` manifest for apps using certain APIs (including some Firebase APIs that access device identifiers). Submitting to the App Store without this manifest results in rejection. This requirement became mandatory in Spring 2024 and affects many Expo + Firebase projects that haven't been updated.

**Warning Signs:**
- App Store Connect submission rejected with "ITMS-91053: Missing API declarations"
- Build succeeds but submission fails

**Prevention Strategy:**
Expo SDK 51+ includes the privacy manifest in the default template. Verify the manifest exists in the iOS build output before submission. If using `@react-native-firebase`, check the current version's release notes for privacy manifest support. Do not attempt App Store submission without testing the full `eas submit` pipeline in staging first.

---

### 6. Development Build Cache Stale After Native Config Change

**What goes wrong:** Changing `app.config.js` (adding a new plugin, changing bundle identifier, modifying permissions) does not invalidate the existing development build. Developers continue using the old build, which doesn't reflect the new native configuration. This causes mysterious failures — e.g., camera permission added to config but camera still denied at runtime.

**Warning Signs:**
- Config changes appear to have no effect on device
- Native module added to plugins but crashes with "native module not found"

**Prevention Strategy:**
Any change to `app.config.js` plugins, permissions, or native dependencies requires a new EAS development build. Document this rule. Use EAS Build's automatic build invalidation by incrementing the `buildNumber`/`versionCode` on every development build that contains native changes.

---

## Phase-Specific Warnings Summary

| Phase Topic | Most Likely Pitfall | Mitigation |
|---|---|---|
| Phase 1: Auth & Setup | Auth race condition flashing login screen | `initializing` state guard before any navigation |
| Phase 1: Auth & Setup | Firestore rules left open | Write rules before writing data |
| Phase 1: EAS Setup | React Native Firebase incompatible with Expo Go | Development build on day one |
| Phase 2: Program Builder | Snapshot not deep-copying exercise references | Transaction embeds full exercise objects at assignment time |
| Phase 2: Program Builder | Drag-to-reorder gesture conflicts | No ScrollView wrapper; GestureHandlerRootView at root |
| Phase 2: Assignment | Timezone bug in "today's workout" calculation | Date-only string storage, local midnight comparison |
| Phase 3: Session Execution | Listener leaks during workout | Every onSnapshot cleanup in useEffect return |
| Phase 3: Session Execution | Timer causing cascade re-renders | Isolated timer component with useSharedValue |
| Phase 4: History | Unbounded session history query | Paginated query with limit(20) + startAfter cursor |
| Phase 4: History | Missing composite indexes in production | firestore.indexes.json committed and deployed |
| All phases | Client confusion on rest/not-started states | Explicit screen design for all assignment states |
| All phases | Video exits app | expo-web-browser in-app sheet, not Linking.openURL |

---

## Sources

- React Native Firebase — `onAuthStateChanged` initializing pattern: https://github.com/invertase/react-native-firebase/blob/main/docs/auth/usage/index.mdx (HIGH confidence)
- Firebase Auth — Token lifecycle and refresh: https://firebase.google.com/docs/auth/users (HIGH confidence)
- Firestore — Write contention and hot spots: https://firebase.google.com/docs/firestore/best-practices (HIGH confidence)
- Firestore — Timestamp hot spots in sequential indexes: https://firebase.google.com/docs/firestore/solutions/shard-timestamp (HIGH confidence)
- Firestore — Index overview and composite index requirements: https://firebase.google.com/docs/firestore/query-data/index-overview (HIGH confidence)
- Firestore — Security rules role-based access: https://firebase.google.com/docs/firestore/solutions/role-based-access (HIGH confidence)
- Firestore — Insecure rules guidance: https://firebase.google.com/docs/firestore/enterprise/security/insecure-rules (HIGH confidence)
- Firestore — Pagination with cursors: https://firebase.google.com/docs/firestore/query-data/query-cursors (HIGH confidence)
- Expo — React Native Firebase requires custom native code / development build: https://docs.expo.dev/guides/using-firebase (HIGH confidence)
- Expo — EAS secret file variables for google-services.json: https://docs.expo.dev/eas/environment-variables/manage (HIGH confidence)
- Expo — expo-router auth redirect patterns: https://docs.expo.dev/router/reference/redirects (HIGH confidence)
- Expo — SDK version mismatch fix: https://docs.expo.dev/troubleshooting/react-native-version-mismatch (HIGH confidence)
- react-native-draggable-flatlist — GestureHandlerRootView requirement: https://github.com/computerjazz/react-native-draggable-flatlist/blob/main/README.md (HIGH confidence)
- TanStack Query — Offline mutations and retry: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/mutations.md (HIGH confidence)
- Firebase Functions — Cold start and minimum instances: https://firebase.google.com/docs/functions/manage-functions (HIGH confidence)
