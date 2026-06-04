# Phase 4: History + Polish — Research

**Researched:** 2026-06-04
**Domain:** Firestore paginated queries, Firebase Storage, expo-image-picker, adherence pure functions, empty-state UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Adherence (HIST-04)**
- D-01: Adherence = completed sessions / scheduled workout days elapsed. Denominator = non-rest days the program scheduled from `startDate` up to `min(today, program end)`. Pure function over assignment snapshot + startDate, reusing Phase 3 date-only math.
- D-02: A partial session counts toward the numerator — any saved session for a scheduled day = completed.
- D-03: Adherence computed over the current active program only; resets when a new program is assigned. Shown as % on each trainer client-list card.

**Session history (HIST-01/02/03)**
- D-04: History list is all-time, newest-first, paginated. Same component serves client viewing own history and trainer viewing a specific client's history.
- D-05: Status badge derived: green "Completed" when `completedExerciseIds.length === totalExercises`, else yellow "Partial X/Y". No `status` field on Session.
- D-06: Tapping a session opens a detail view showing which exercises were completed. Session stores `completedExerciseIds` + `routineName` but not exercise names — resolve names from assignment snapshot for that `weekIndex/dayIndex` (or store names at finish; planner decides).

**Profiles + photos (PROF-01/02/03)**
- D-07: Each user edits only their own name + photo.
- D-08: Photo source = camera + photo library via `expo-image-picker` — NEW native module, requires one dev-client rebuild.
- D-09: Square-crop in picker + downscale to ~512px before upload.
- D-10: Store photo in Firebase Storage at `users/{uid}/profile.jpg`; save download URL to user doc `photoURL`; display via `ClientPhoto` (expo-image, cached). Storage security rules must allow user to write only `users/{uid}/*`.

**Empty states (success criterion 5)**
- D-11: Single reusable `EmptyState` component (icon + title + message) for every list that can be empty: exercises, routines, programs, clients, sessions/history.
- D-12: Actionable lists get a CTA; derived/read-only lists (session history) get message only.

### Claude's Discretion
- Pagination mechanism + page size (e.g. ~20, infinite-scroll vs "Load more") — use existing `sessions (clientId, date DESC)` composite index.
- Exact empty-state copy + icons per screen; exact adherence rounding/format (e.g. "82%").
- Whether session detail re-derives exercise names from the snapshot or the finish flow denormalises them into the session record.
- Storage upload path naming + whether to delete the old photo on replace.

### Deferred Ideas (OUT OF SCOPE)
- Push notifications / workout reminders — post-MVP.
- In-app trainer/client messaging — post-MVP.
- Trainer editing a client's photo/profile — out of scope.
- Analytics/charts beyond the single adherence % — post-MVP.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | Client can view a paginated list of their completed sessions (date, routine name, status) | useInfiniteQuery + RNFB `.startAfter(lastDoc)` pattern; existing `sessions(clientId, date DESC)` index |
| HIST-02 | Client can tap a session to see which exercises were completed | Session stores `completedExerciseIds`; names resolved from assignment snapshot `weekIndex/dayIndex.routine.exercises` |
| HIST-03 | Trainer can view a paginated list of a specific client's sessions (from client profile screen) | Same service + hook as HIST-01; `clientId` param from route; sessions read rule covers trainer via `resource.data.trainerId == request.auth.uid` |
| HIST-04 | Trainer's client list card shows adherence % | Pure function `computeAdherence(assignment, sessions, today)`; RNFB DOES NOT support `onSnapshot` count — fetch all sessions for assignment in one query (small N in MVP) |
| PROF-01 | Client can view and edit their name and profile photo | Profile screen upgrade: existing TextField + new ImagePicker flow + Storage upload service |
| PROF-02 | Trainer can view and edit their own name and profile photo | Mirrors PROF-01 but trainer profile screen |
| PROF-03 | Profile photos stored in Firebase Storage; loaded with caching (expo-image) | `@react-native-firebase/storage` v24 already installed; `expo-image` already in use; NEW: `storage.rules` file + firebase.json storage entry |
</phase_requirements>

---

## Summary

Phase 4 closes the LauFit MVP with four distinct technical domains. Three of them are straightforward applications of established project patterns (session-history query, adherence pure function, EmptyState component); one carries meaningful new infrastructure: **Firebase Storage + expo-image-picker**, which requires a new native module install, a dev-client rebuild, a new `storage.rules` file, and a new firebase.json entry.

The session-history paginated list uses `useInfiniteQuery` with `startAfter(lastDoc)` against the existing `sessions(clientId ASC, date DESC)` composite index — both roles are already covered by the sessions read rule. Adherence is a pure TypeScript function over the assignment snapshot; it iterates over `snapshot.weeks[w].days[d]` where `type === 'routine'` and counts days from `startDate` through `min(today, programEnd)`. The exercise-name resolution in session detail is a discrete architecture decision deferred to the planner (re-derive from snapshot vs. denormalise at finish-time).

Firebase Storage is already installed (`@react-native-firebase/storage ^24.0.0`) but `storage.rules` does not yet exist and `firebase.json` has no `storage` entry. The upload path is: `expo-image-picker` (new install, SDK 55 `~55.0.x`) → `result.assets[0].uri` → `storage().ref('users/{uid}/profile.jpg').putFile(uri)` → `getDownloadURL()` → write to `users/{uid}` Firestore doc. The URI returned by expo-image-picker is `file://...` on both platforms (modern SDK returns unified `uri` field in `assets[0]`); `putFile()` accepts it directly.

**Primary recommendation:** Build in this order — (1) `EmptyState` component + wire all lists, (2) adherence pure function + ClientListItem badge, (3) session-history service/hook/list/detail, (4) Storage upload service + profile edit screens. Install `expo-image-picker` and rebuild dev-client as the first step of wave covering PROF-01/02/03.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Paginated session history reads | API / Backend (Firestore) | Frontend (React hook) | Query lives server-side; cursor passed through useInfiniteQuery |
| Adherence calculation | Frontend (pure function) | — | All data already on client after assignment + sessions fetched; pure TS over snapshots |
| Session-detail exercise name resolution | Frontend (derived from snapshot) | — | Assignment snapshot fully denormalised — no extra Firestore read needed if re-deriving |
| Profile photo upload | Frontend (client-side flow) | Backend (Firebase Storage) | Client picks, crops, uploads; Storage enforces path-based auth rule |
| Photo display with caching | Browser / Client (expo-image) | CDN (Storage download URL) | expo-image caches by URL; Storage serves the download URL |
| Storage security | Backend (storage.rules) | — | Rules must be written and deployed; client SDK cannot enforce |
| EmptyState component | Browser / Client (React Native) | — | Pure presentational component, no data tier involvement |

---

## Standard Stack

### Core (all already installed — no new packages except expo-image-picker)

| Library | Installed Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| `@react-native-firebase/storage` | ^24.0.0 | Firebase Storage upload + download URL | Already a dep; RNFB canonical choice for RN |
| `@react-native-firebase/firestore` | ^24.0.0 | Session history queries with cursor | Already in use for all Firestore reads |
| `@tanstack/react-query` | ^5.100.14 | `useInfiniteQuery` for paginated sessions | Already project-wide standard |
| `expo-image` | ~55.0.11 | Display cached profile photos | Already in use in ClientPhoto |
| `expo-image-picker` | ~55.0.x (NEW) | Camera + photo library picker | Official Expo SDK module; config-plugin based |

### New Package

| Library | Registry Version | Purpose | Install Command |
|---------|-----------------|---------|-----------------|
| `expo-image-picker` | ~55.0.20 (SDK 55 latest) | Photo picker (camera + library) | `npx expo install expo-image-picker` |

[VERIFIED: npm registry] — `expo-image-picker` exists on npm, SDK-55 range `55.0.0`–`55.0.20` confirmed via `npm view`.
[CITED: docs.expo.dev/versions/v55.0.0/sdk/imagepicker/] — official Expo SDK 55 documentation page.

**Installation:**
```bash
npx expo install expo-image-picker
```
`npx expo install` auto-pins to the SDK-55 compatible version. This is a **native module** — a dev-client rebuild is required before first use.

**Version verification:**
```
expo-image-picker: 55.0.20 (SDK-55 latest, no postinstall script — clean)
@react-native-firebase/storage: 24.0.0 (already installed)
```

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time (pip install failed). All packages below are tagged `[ASSUMED]` based on npm registry verification and official documentation corroboration. The planner must gate each install behind a `checkpoint:human-verify` task if desired — however these are well-established Expo SDK / RNFB packages with strong provenance signals.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo-image-picker` | npm | ~7 yrs (2019) | Millions/wk (Expo SDK module) | github.com/expo/expo | [ASSUMED — slopcheck unavailable] | Approved — official Expo SDK module |
| `@react-native-firebase/storage` | npm | ~7 yrs (2019) | Millions/wk | github.com/invertase/react-native-firebase | [ASSUMED — slopcheck unavailable] | Approved — already installed |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none — both packages are from well-known, official SDK organisations (expo/expo, invertase/react-native-firebase) with years of usage.

*slopcheck was unavailable at research time — all packages above are tagged `[ASSUMED]`. Planner may add `checkpoint:human-verify` before the install task as a precaution.*

---

## Architecture Patterns

### System Architecture Diagram

```
Client / Trainer role
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  React Native UI Layer                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  SessionHistory   │  │ ProfileEdit      │  │ ClientListItem │ │
│  │  List + Detail   │  │ (name + photo)   │  │ (adherence %)  │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           │ useInfiniteQuery     │ useMutation         │ useQuery  │
│           │                     │ + uploadPhoto       │ +         │
│           │                     │                     │ pure fn   │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────────┐  ┌───────────────────┐
│ session.service  │  │ storage.service       │  │ computeAdherence  │
│ fetchSessionPage │  │ uploadProfilePhoto    │  │ (pure function)   │
│ (clientId,cursor)│  │ putFile + getURL +    │  │ snapshot + today  │
│                  │  │ updateUserPhotoURL    │  │ → adherence %     │
└────────┬─────────┘  └──────────┬────────────┘  └───────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐  ┌──────────────────────┐
│ Firestore        │  │ Firebase Storage      │
│ sessions         │  │ users/{uid}/          │
│ (clientId, date) │  │ profile.jpg           │
│ composite index  │  │ (storage.rules)       │
└──────────────────┘  └──────────────────────┘
                                │
                         ┌──────▼──────────┐
                         │ users Firestore  │
                         │ doc: photoURL    │
                         └──────────────────┘
```

### Recommended Project Structure

```
src/
├── lib/
│   └── adherence.ts           # computeAdherence() pure function
├── services/
│   ├── session.service.ts     # ADD: fetchSessionPage(), fetchSessionsForAdherence()
│   └── storage.service.ts     # NEW: uploadProfilePhoto(uid, uri) → string (downloadURL)
├── hooks/
│   ├── useSessionHistory.ts   # NEW: useInfiniteQuery wrapper for session pages
│   └── useUpdateProfile.ts    # NEW: useMutation wrapping name + photo update
├── components/
│   ├── ui/
│   │   └── EmptyState.tsx     # NEW: reusable empty state (icon + title + message + optional CTA)
│   └── sessions/
│       ├── SessionListItem.tsx # NEW: date, routineName, status badge
│       └── SessionDetail.tsx   # NEW: exercise name list from completedExerciseIds
├── app/
│   ├── client/
│   │   ├── history.tsx        # NEW: history tab/screen (useSessionHistory + EmptyState)
│   │   └── profile.tsx        # UPGRADE: name + photo edit
│   └── trainer/
│       ├── profile.tsx        # UPGRADE: name + photo edit
│       └── clients/
│           ├── index.tsx      # MODIFY: ClientListItem shows adherence %
│           └── [clientId].tsx # MODIFY: replace SESSION HISTORY placeholder with real list
└── storage.rules              # NEW: Firebase Storage security rules
```

### Pattern 1: useInfiniteQuery with RNFB Firestore cursor pagination

**What:** Fetches sessions in pages of 20, newest-first, using the last Firestore document snapshot as the cursor for `.startAfter()`.

**When to use:** Any list large enough to need pagination — session history is the only one in this phase.

**Key insight for RNFB vs Firebase JS SDK:** RNFB `QuerySnapshot.docs[N]` is a `FirebaseFirestoreTypes.QueryDocumentSnapshot` which is valid as a `startAfter` cursor argument in RNFB.

```typescript
// Source: TanStack Query v5 docs + RNFB firestore usage pattern
// [CITED: tanstack.com/query/v5/docs/framework/react/guides/infinite-queries]

import { useInfiniteQuery } from '@tanstack/react-query';
import { sessionsCollection } from '@/firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Session } from '@/types/session';

const PAGE_SIZE = 20;

export interface SessionPage {
  items: Session[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | undefined;
}

async function fetchSessionPage(
  clientId: string,
  cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot | undefined
): Promise<SessionPage> {
  let q = sessionsCollection()
    .where('clientId', '==', clientId)
    .orderBy('date', 'desc')
    .limit(PAGE_SIZE);

  if (cursor) {
    q = q.startAfter(cursor);
  }

  const snap = await q.get();
  return {
    items: snap.docs.map((d) => ({ ...d.data(), id: d.id } as Session)),
    lastDoc: snap.docs[snap.docs.length - 1],
  };
}

export function useSessionHistory(clientId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['sessionHistory', clientId],
    queryFn: ({ pageParam }) => fetchSessionPage(clientId!, pageParam),
    initialPageParam: undefined as
      | FirebaseFirestoreTypes.QueryDocumentSnapshot
      | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.lastDoc,
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

// In the UI: flatten pages
// const sessions = data.pages.flatMap((page) => page.items);
```

**In FlatList:** Pass `onEndReached={() => hasNextPage && fetchNextPage()}` with `onEndReachedThreshold={0.3}`. Gate with `isFetchingNextPage` to prevent double-fetches.

---

### Pattern 2: Adherence pure function

**What:** Computes adherence % from an `Assignment` snapshot and a list of session records. Reuses `parseDateOnly`, `localTodayString`, `dayOffset` from `workoutDayComputer.ts`.

**Critical algorithm:**

1. Compute `programEndDate = addDays(assignment.startDate, snapshot.durationWeeks * 7 - 1)`
2. Compute `today = localTodayString()`
3. `capDate = min(today, programEndDate)` (compare as YYYY-MM-DD strings — lexicographic sort is correct for ISO dates)
4. Iterate `offset = 0` through `dayOffset(startDate, capDate)` inclusive:
   - `weekIndex = Math.floor(offset / 7)`; `dayIndex = offset % 7`
   - If `snapshot.weeks[weekIndex]?.days[dayIndex]?.type === 'routine'` → denominator++
5. Numerator = `sessions.length` where `sessions` are those belonging to `assignment.id` (filter by `assignmentId` on the already-fetched list)
6. If denominator = 0 → return `null` (program hasn't started or all rest days so far)
7. Return `Math.round((numerator / denominator) * 100)` → format as `"82%"`

**Off-by-one guard:** `dayOffset` returns 0 on the start date itself. The loop `for offset = 0; offset <= dayOffset(startDate, capDate)` correctly includes day 0 (the first day of the program). Using `< PAGE_SIZE` exclusive bound would skip the last day — use `<=`.

**Program-end cap:** Compare `today` vs `programEndDate` as strings — because both are YYYY-MM-DD, the JavaScript string comparison `today > programEndDate` is accurate without parsing. This avoids the local-midnight parsing on the cap check.

```typescript
// src/lib/adherence.ts
// Source: derived from workoutDayComputer.ts patterns [CITED: src/lib/workoutDayComputer.ts]

import { parseDateOnly, localTodayString, dayOffset } from './workoutDayComputer';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';

/**
 * Returns adherence percentage (0–100) or null if denominator is 0.
 *
 * Denominator: count of 'routine' days from startDate up to min(today, programEnd).
 * Numerator: count of sessions for the given assignment.
 * Partial sessions count (D-02).
 */
export function computeAdherence(
  assignment: Assignment,
  sessions: Session[],
  todayStr: string = localTodayString()
): number | null {
  const { startDate, snapshot } = assignment;
  const totalDays = snapshot.durationWeeks * 7;

  // Program end = startDate + (totalDays - 1) as YYYY-MM-DD
  const startMs = parseDateOnly(startDate).getTime();
  const endMs = startMs + (totalDays - 1) * 86_400_000;
  const endDate = new Date(endMs);
  const endDateStr = [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, '0'),
    String(endDate.getDate()).padStart(2, '0'),
  ].join('-');

  // Cap at min(today, programEnd) — string comparison is correct for ISO dates
  const capStr = todayStr < endDateStr ? todayStr : endDateStr;

  // Program hasn't started yet
  if (todayStr < startDate) return null;

  const capOffset = dayOffset(startDate, capStr);

  let denominator = 0;
  for (let offset = 0; offset <= capOffset; offset++) {
    const weekIndex = Math.floor(offset / 7);
    const dayIndex = offset % 7;
    const day = snapshot.weeks[weekIndex]?.days[dayIndex];
    if (day?.type === 'routine') denominator++;
  }

  if (denominator === 0) return null;

  const numerator = sessions.filter((s) => s.assignmentId === assignment.id).length;
  return Math.round((numerator / denominator) * 100);
}
```

**Test case:** Program with 2 weeks, M/W/F routine days. `startDate = 2026-06-02` (Tuesday). On `today = 2026-06-08` (Monday): offset 0=Tue(no), 1=Wed(yes), 2=Thu(no), 3=Fri(yes), 4=Sat(no), 5=Sun(no), 6=Mon(no) — denominator=2. If 1 session → 50%. Correct.

---

### Pattern 3: Firebase Storage upload flow

**What:** Picks an image, uploads to Storage, saves download URL to Firestore user doc.

**The URI platform note (researched):** expo-image-picker (modern API, `result.assets[0].uri`) returns `file://...` on both iOS and Android. The older property split (`path` on Android, `uri` on iOS) was specific to older image-picker libraries. RNFB `putFile()` accepts `file://` URIs directly on both platforms. [CITED: docs.expo.dev/versions/v55.0.0/sdk/imagepicker/]

```typescript
// src/services/storage.service.ts
import storage from '@react-native-firebase/storage';
import { usersCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';

/**
 * Uploads a photo from a local file URI to Firebase Storage at users/{uid}/profile.jpg.
 * Returns the HTTPS download URL.
 * Overwrites any existing photo at the same path (no cleanup needed — same key).
 */
export async function uploadProfilePhoto(uid: string, fileUri: string): Promise<string> {
  const ref = storage().ref(`users/${uid}/profile.jpg`);
  await ref.putFile(fileUri);
  return await ref.getDownloadURL();
}

/**
 * Saves the photoURL (and optionally name) to the user's Firestore doc.
 */
export async function updateUserProfile(
  uid: string,
  partial: { photoURL?: string; name?: string }
): Promise<void> {
  await usersCollection()
    .doc(uid)
    .update(stripUndefinedDeep(partial));
}
```

**expo-image-picker call:**
```typescript
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: 'images',      // SDK 55: string literal, not deprecated MediaTypeOptions
  allowsEditing: true,
  aspect: [1, 1],            // Square crop; iOS respects this only with allowsEditing=true
  quality: 0.7,              // Lossy compression → ~512px at 0.7 produces small files
});

if (!result.canceled && result.assets[0]) {
  const uri = result.assets[0].uri;
  const downloadURL = await uploadProfilePhoto(uid, uri);
  await updateUserProfile(uid, { photoURL: downloadURL });
}
```

**Camera flow** (identical except `launchCameraAsync`):
```typescript
const result = await ImagePicker.launchCameraAsync({
  allowsEditing: true, aspect: [1, 1], quality: 0.7,
});
```

---

### Pattern 4: EmptyState component

**What:** A single reusable presentational component for zero-item lists.

```typescript
// src/components/ui/EmptyState.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  /** Optional CTA label — omit for read-only lists (session history). */
  ctaLabel?: string;
  onCta?: () => void;
  /** Expo vector icon name or custom icon element. */
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, ctaLabel, onCta, icon }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
      {icon && <View style={{ marginBottom: 16 }}>{icon}</View>}
      <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ color: '#888888', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
        {message}
      </Text>
      {ctaLabel && onCta && (
        <Pressable
          onPress={onCta}
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10,
            backgroundColor: '#00FF66', borderRadius: 8 }}
        >
          <Text style={{ color: '#000000', fontWeight: '600', fontSize: 15 }}>
            {ctaLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
```

**Screens that need EmptyState wired (D-11/D-12):**

| Screen | File | CTA? | Existing empty handling |
|--------|------|------|------------------------|
| Exercises | `src/app/trainer/exercises/index.tsx` | Yes ("+ Add Exercise") | Inline Text — replace with EmptyState |
| Routines | `src/app/trainer/routines/index.tsx` | Yes ("+ New Routine") | Needs audit |
| Programs | `src/app/trainer/programs/index.tsx` | Yes ("+ New Program") | Needs audit |
| Clients | `src/app/trainer/clients/index.tsx` | Yes ("+ Add Client") | Inline Text — replace with EmptyState |
| Session history (client) | new `client/history.tsx` | No (message only) | N/A — new screen |
| Session history (trainer view) | `trainer/clients/[clientId].tsx` | No (message only) | Placeholder comment |

---

### Pattern 5: Session detail exercise name resolution

**The decision (deferred to planner, D-06):**

**Option A — Re-derive from assignment snapshot (recommended):**
- Session stores `assignmentId`, `weekIndex`, `dayIndex`.
- Use `useActiveAssignment(clientId)` (already exists) or a new `useAssignment(assignmentId)` hook.
- Look up `assignment.snapshot.weeks[weekIndex].days[dayIndex].routine.exercises`.
- Cross-reference with `completedExerciseIds` (exercise IDs — check if `exercise.exerciseId` is in the set).
- **Pro:** No schema change, no duplicate data, always reflects snapshot at assignment time.
- **Con:** Requires reading the assignment doc on session-detail open (likely cached by TanStack Query).

**Option B — Denormalise names into session at finish-time:**
- Modify `createSession` to include `completedExerciseNames: string[]` (parallel array to IDs).
- **Pro:** Session detail is self-contained, zero extra reads.
- **Con:** Schema change to Session type; Phase 3 is already complete — requires backward-compatible migration (old sessions have no names → fallback to ID or "Unknown").
- **Risk:** Old sessions (Phase 3 test data) will show "Unknown" for exercise names until migrated.

**Recommendation (Claude's discretion):** Use **Option A**. The assignment snapshot is small, already cached by `useActiveAssignment`/`useActiveAssignment` hooks, and requires zero schema changes. Introduce `useAssignment(assignmentId)` hook that fetches by document ID — a single `.get()` on the assignments collection, covered by the existing assignments read rule.

---

### Anti-Patterns to Avoid

- **Don't query sessions without `clientId` filter.** The sessions collection has no global read rule — queries without `clientId ==` will be denied by Firestore rules.
- **Don't compute adherence inside the render function.** Move to a `useMemo` or a pure function in `src/lib/adherence.ts` consumed by `ClientListItem` after the assignment + sessions are fetched.
- **Don't use `toISOString().slice(0,10)` for date comparisons in adherence.** Use `parseDateOnly` from `workoutDayComputer.ts` to avoid UTC-midnight off-by-one in negative-UTC timezones.
- **Don't call `fetchNextPage()` without checking `isFetchingNextPage`.** useInfiniteQuery allows concurrent fetches — add `!isFetchingNextPage && hasNextPage` guard on `onEndReached`.
- **Don't use `result.assets[0].path` for RNFB putFile.** Modern expo-image-picker returns `result.assets[0].uri` on both platforms (file:// prefix). The older `path` field is from an earlier SDK API.
- **Don't ship without `storage.rules`.** Without storage rules, Firebase Storage defaults to deny-all (after the initial 30-day open period) or allow-all depending on the project's default rule. Writing explicit rules prevents both data exposure and silent upload failures.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Paginated Firestore reads | Custom page state + offset tracking | `useInfiniteQuery` + `.startAfter(doc)` | TanStack Query handles cache, background refetch, concurrent request prevention |
| Image square-crop to 512px | Custom image manipulation | `expo-image-picker allowsEditing + aspect [1,1] + quality 0.7` | System UI crop; quality parameter does lossy compression; no extra libs needed |
| Photo caching | Custom file cache | `expo-image` (already in use) | expo-image's built-in LRU disk cache handles URL-based caching transparently |
| Infinite scroll UI feedback | Manual loading state | `isFetchingNextPage` from useInfiniteQuery | Built-in boolean — show ActivityIndicator at list footer |
| Storage upload progress | Custom Task listener | `await ref.putFile(uri)` (fire-and-forget for MVP) | MVP avatars are small (~50–100KB after quality 0.7) — no progress needed |
| Date string min/max for program-end cap | `new Date()` parsing | String comparison on YYYY-MM-DD | ISO date strings sort lexicographically — `'2026-06-08' < '2026-07-01'` is correct. No parsing overhead, no timezone risk |

**Key insight:** The assignment snapshot is already fully denormalised with exercise names. Re-deriving exercise names from the snapshot for session detail is a single cache hit, not a new Firestore read. Don't denormalise names into the Session document just to avoid this — that creates a migration debt on Phase 3's already-committed data.

---

## Common Pitfalls

### Pitfall 1: Missing storage.rules file — silent upload failures or security gap

**What goes wrong:** `@react-native-firebase/storage` is installed and linked, but there is no `storage.rules` file and `firebase.json` has no `storage` entry. Firebase Storage will use whatever default rules are set in the console (often allow-all during development, deny-all in production). Upload from client silently fails with "Unauthorized" on prod. Or worse: all files are publicly writable.

**Why it happens:** `firebase init firestore` creates `firestore.rules`; Storage rules require a separate `firebase init storage` step which was never done.

**How to avoid:** Create `storage.rules` and add a `storage` entry to `firebase.json` as a Wave 0 task:

```
# storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

```json
// firebase.json — add storage section
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "functions": { "source": "functions" },
  "storage": { "rules": "storage.rules" }
}
```

Deploy: `firebase deploy --only storage`

[CITED: firebase.google.com/docs/storage/security/core-syntax]

**Warning signs:** Upload throws `storage/unauthorized` or `403` in device logs.

---

### Pitfall 2: expo-image-picker not configured in app.config.js — permissions crash on iOS

**What goes wrong:** `expo-image-picker` requires a config plugin entry with `photosPermission` and `cameraPermission` strings for iOS `Info.plist`. Without it, the iOS permission dialog shows an empty string and the system may deny the request silently.

**Why it happens:** Config plugin step is separate from `npx expo install`. Missing the plugin entry is easy to forget.

**How to avoid:** Add to `app.config.js` plugins array **and rebuild dev-client**:

```js
// In plugins array of app.config.js:
[
  'expo-image-picker',
  {
    photosPermission: 'Allow TrainingCenter to access your photos to set a profile picture.',
    cameraPermission: 'Allow TrainingCenter to use your camera to take a profile photo.',
  },
],
```

[CITED: docs.expo.dev/versions/v55.0.0/sdk/imagepicker/]

**Warning signs:** Permission dialog shows empty description string on iOS; Android camera/gallery never prompts.

---

### Pitfall 3: Adherence denominator includes future days

**What goes wrong:** Loop iterates over all `snapshot.durationWeeks * 7` days instead of only days up to `min(today, programEnd)`. A client 1 day into a 4-week program shows 2% adherence instead of 100% (if they completed yesterday).

**Why it happens:** Forgetting the `capDate` ceiling. The intuitive loop is `for offset = 0; offset < totalDays` but this counts future scheduled days.

**How to avoid:** Use `capOffset = dayOffset(startDate, capStr)` as the loop bound. See Pattern 2 above.

**Warning signs:** Adherence % looks implausibly low for clients early in their program.

---

### Pitfall 4: Rebuilding dev-client after expo-image-picker install

**What goes wrong:** `npx expo install expo-image-picker` succeeds, code imports it, but the app throws `expo-image-picker: native module not found` at runtime because the dev-client binary doesn't include the native module.

**Why it happens:** React Native native modules must be compiled into the binary. JS-only installs don't update the binary.

**How to avoid:** After `npx expo install expo-image-picker` and adding the config plugin to `app.config.js`, run an EAS dev-client build before testing:
```bash
eas build --profile development --platform ios   # or android
```

**Warning signs:** `NativeModules.ExponentImagePicker is null` or similar native module error at runtime.

---

### Pitfall 5: `useInfiniteQuery` re-fetch stomps cursor on background refresh

**What goes wrong:** When TanStack Query re-fetches (stale data), infinite queries re-fetch all pages from page 1 sequentially. If the user has loaded 5 pages and the app goes to background+foreground, the query re-fetches pages 1–5 in sequence. This is correct behaviour but can cause visible list churn if `staleTime` is too low.

**Why it happens:** TanStack Query v5 re-fetches the entire infinite query on background focus by default.

**How to avoid:** Set `staleTime: 60_000` (1 minute) for session history — history is append-only, old pages don't change. Also set `gcTime: 5 * 60_000` to keep pages in cache while navigating away.

**Warning signs:** List scrolls back to top when user navigates away and returns to the history screen.

---

### Pitfall 6: RNFB `querySnap.empty` (property, not method)

**What goes wrong:** Code calls `querySnap.empty()` (method call) instead of `querySnap.empty` (property). TypeScript may not catch this if the type is loose.

**Why it happens:** Firebase JS SDK uses property, some other SDKs use method. RNFB v24 uses property access (`querySnap.empty`, `documentSnap.exists()`). Note the asymmetry: `QuerySnapshot.empty` is a **property**, `DocumentSnapshot.exists()` is a **method** in RNFB v24.

**How to avoid:** Use `if (snap.empty)` for query snapshots and `if (snap.exists())` for document snapshots. This is already used consistently in the codebase (see `session.service.ts` line 47: `if (snap.empty) return null;`).

---

## Code Examples

### Session history service (fetchSessionPage)

```typescript
// Source: RNFB firestore + TanStack infinite query pattern
// Verified against: firestore.ts collection reference pattern in codebase

import { sessionsCollection } from '@/firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Session } from '@/types/session';

export const SESSION_PAGE_SIZE = 20;

export interface SessionPage {
  items: Session[];
  // undefined if this is the last page
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot<Session> | undefined;
}

export async function fetchSessionPage(
  clientId: string,
  cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot<Session> | undefined
): Promise<SessionPage> {
  let q = sessionsCollection()
    .where('clientId', '==', clientId)
    .orderBy('date', 'desc')
    .limit(SESSION_PAGE_SIZE);

  if (cursor) {
    q = q.startAfter(cursor);
  }

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Session));
  // If fewer than PAGE_SIZE docs returned, we've reached the end
  const lastDoc =
    items.length === SESSION_PAGE_SIZE
      ? (snap.docs[snap.docs.length - 1] as FirebaseFirestoreTypes.QueryDocumentSnapshot<Session>)
      : undefined;

  return { items, lastDoc };
}
```

### Storage security rules (storage.rules)

```
# storage.rules — Phase 4 (PROF-03)
# Source: firebase.google.com/docs/storage/security/core-syntax
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can read and write only their own profile directory.
    // This covers the profile.jpg path: users/{uid}/profile.jpg
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### firebase.json storage entry

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": { "source": "functions" },
  "storage": { "rules": "storage.rules" }
}
```

Deploy command: `firebase deploy --only storage`

### Status badge derivation (D-05)

```typescript
// In SessionListItem.tsx — status is DERIVED, never stored
function getSessionStatus(session: Session): { label: string; color: string } {
  const isComplete = session.completedExerciseIds.length === session.totalExercises;
  if (isComplete) {
    return { label: 'Completed', color: '#00FF66' };
  }
  return {
    label: `Partial ${session.completedExerciseIds.length}/${session.totalExercises}`,
    color: '#FFD600',
  };
}
```

### Session detail exercise name resolution (Option A — re-derive from snapshot)

```typescript
// In session detail view — given session.weekIndex, session.dayIndex, session.assignmentId
// and assignment (fetched by useAssignment(session.assignmentId)):

const day = assignment?.snapshot.weeks[session.weekIndex]?.days[session.dayIndex];
const allExercises = day?.routine?.exercises ?? [];
const completedSet = new Set(session.completedExerciseIds);

// Partition into completed and not-completed
const completedExercises = allExercises.filter((e) => completedSet.has(e.exerciseId));
const skippedExercises = allExercises.filter((e) => !completedSet.has(e.exerciseId));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useQuery` with manual page state | `useInfiniteQuery` with cursor | TanStack v5 (stable) | Built-in `hasNextPage`, `fetchNextPage`, `isFetchingNextPage` |
| `expo-av` for media | `expo-video` (already in use) | SDK 53 deprecation, SDK 54 removal | Already handled in Phase 3 |
| `result.uri` (old image picker API) | `result.assets[0].uri` | expo-image-picker v12+ (multi-asset API) | Must use `result.assets[0].uri`, not `result.uri` |
| `ImagePicker.MediaTypeOptions.Images` | `'images'` string literal | SDK 54+ (MediaTypeOptions deprecated) | Use string literals for `mediaTypes` |

**Deprecated/outdated:**
- `ImagePicker.MediaTypeOptions` enum: deprecated in recent versions, use `'images'` string literal instead. [CITED: docs.expo.dev/versions/v55.0.0/sdk/imagepicker/]
- `result.uri` (top-level): replaced by `result.assets[0].uri` in the multi-asset API.

---

## Open Questions

1. **Session detail exercise name resolution (planner decides — D-06)**
   - What we know: Option A (re-derive from snapshot) requires `useAssignment(assignmentId)` hook — one document get, likely cached. Option B (denormalise at finish-time) requires Session schema change and backward-compat handling for old sessions.
   - What's unclear: Whether the planner wants to denormalise for simplicity at the cost of schema migration debt.
   - Recommendation: Option A — zero schema change, assignments are small and already in TanStack Query cache for the trainer's view.

2. **Adherence for trainer's client list — sessions fetch strategy**
   - What we know: Adherence requires sessions for the current assignment. `ClientListItem` receives a `User` object today — it would need `assignmentId` + fetched session count to compute adherence.
   - What's unclear: Whether to fetch sessions-per-client eagerly (N+1 problem for trainer with 20+ clients) or lazily (compute only when list item renders).
   - Recommendation: For MVP (Lau has ~5 clients), fetch sessions per client lazily in `ClientListItem` using `useQuery`. Use `assignmentId` as a query key component and filter sessions by `assignmentId` client-side. Flag for optimization if client count grows.

3. **Delete old photo on profile photo replace**
   - What we know: Overwriting `users/{uid}/profile.jpg` with a new upload replaces the bytes; the same path = no orphan files.
   - What's unclear: Nothing — using a fixed path `users/{uid}/profile.jpg` is the correct decision (D-10 implies this path).
   - Recommendation: Fixed path, no delete step needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@react-native-firebase/storage` | PROF-03 photo upload | Yes (installed) | 24.0.0 | — |
| `expo-image-picker` | PROF-01/02 photo picker | No (not installed) | — | Install via `npx expo install expo-image-picker` |
| EAS dev-client build | expo-image-picker native module | Yes (EAS configured) | SDK 55 | — |
| Firebase CLI (`firebase deploy`) | Deploy `storage.rules` | Unknown — not checked | — | `npm install -g firebase-tools` |
| Firestore composite index `sessions(clientId ASC, date DESC)` | HIST-01/03 pagination | Yes (in firestore.indexes.json) | — | — |

**Missing dependencies with no fallback:**
- `expo-image-picker` — not installed; must install + rebuild dev-client before any PROF-01/02/03 tasks run.

**Missing dependencies with fallback:**
- Firebase CLI — if not available locally, can be installed with `npm install -g firebase-tools` or use `npx firebase-tools deploy --only storage`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (jest-expo ~55.0.18) + ts-jest ^29.4.11 |
| Config file | `jest.config.js` (split: react-native + firestore-rules projects) |
| Quick run command | `npx jest --testPathPattern="adherence\|session"` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Paginated session list returns page of 20, newest first | unit (service) | `npx jest --testPathPattern="session.service"` | No — Wave 0 |
| HIST-02 | Session detail resolves exercise names from snapshot | unit (pure fn) | `npx jest --testPathPattern="sessionDetail"` | No — Wave 0 |
| HIST-03 | Trainer query uses same service fn with clientId | unit (service) | `npx jest --testPathPattern="session.service"` | No — Wave 0 |
| HIST-04 | `computeAdherence` returns correct % for various day patterns | unit (pure fn) | `npx jest --testPathPattern="adherence"` | No — Wave 0 |
| PROF-01 | `uploadProfilePhoto` calls putFile + getDownloadURL | unit (mocked storage) | `npx jest --testPathPattern="storage.service"` | No — Wave 0 |
| PROF-02 | Same as PROF-01 (same service) | unit | same | No — Wave 0 |
| PROF-03 | `updateUserProfile` writes photoURL to Firestore user doc | unit (mocked firestore) | `npx jest --testPathPattern="storage.service"` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="adherence|session.service|storage.service" --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/adherence.test.ts` — covers HIST-04 (multiple day patterns, off-by-one, cap)
- [ ] `src/services/__tests__/session.service.test.ts` — covers HIST-01/03 pagination cursor behaviour
- [ ] `src/services/__tests__/storage.service.test.ts` — covers PROF-01/02/03 upload + Firestore write (mocked RNFB modules)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A — auth already established Phase 1 |
| V3 Session Management | No | N/A |
| V4 Access Control | Yes | `storage.rules` path-based auth; Firestore users owner-update rule already enforces photoURL write |
| V5 Input Validation | Yes | Zod v4 for profile form (name field — trim + min length); no user-provided paths in Storage ref |
| V6 Cryptography | No | Storage download URLs use Firebase-signed tokens, not hand-rolled crypto |
| V9 Communications | Partial | All Firebase calls over HTTPS by default; no custom certificates needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User uploads file to another user's Storage path | Tampering | `storage.rules`: `request.auth.uid == userId` path check |
| User elevates own role via profile update | Elevation of Privilege | Existing Firestore rule: `affectedKeys().hasAny(['role', 'trainerId'])` blocks it; `photoURL` is not a privileged field |
| Trainer reads another trainer's client sessions | Information Disclosure | Firestore sessions read rule: `resource.data.trainerId == request.auth.uid` — only the client's trainer can read |
| Arbitrary file upload content | Tampering | Out of scope for MVP — no content-type validation in storage.rules; profile photos are display-only with no server-side execution risk |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-image-picker` returns unified `result.assets[0].uri` with `file://` prefix on both iOS and Android in SDK 55 | Code Examples (Pattern 3) | If Android returns a different path format, `putFile()` may fail — easy to detect and fix in first test run |
| A2 | RNFB v24 `putFile(fileUri)` accepts `file://` URIs directly on both platforms without path transformation | Code Examples (Pattern 3) | If path transform needed (e.g., strip `file://` prefix on Android), upload silently fails — detected immediately in manual test |
| A3 | Sessions count per assignment for adherence is small enough (< 200) to fetch all in one query for MVP | Open Questions | If a client has an unusually long program, a single query page may not return all sessions — add a `.limit(365)` guard |
| A4 | `firebase deploy --only storage` is the correct CLI command to deploy storage.rules | Code Examples | Minor — deploy command syntax is stable; worst case is CLI flag difference |

**If this table is empty:** N/A — assumptions are documented above.

---

## Sources

### Primary (HIGH confidence)
- [CITED: docs.expo.dev/versions/v55.0.0/sdk/imagepicker/] — expo-image-picker SDK 55 API, permissions, config plugin, `assets[0].uri` return shape, `mediaTypes` string literal
- [CITED: firebase.google.com/docs/storage/security/core-syntax] — storage.rules syntax, `request.auth.uid == userId` path-matching pattern
- [CITED: tanstack.com/query/v5/docs/framework/react/guides/infinite-queries] — `useInfiniteQuery` API, `initialPageParam`, `getNextPageParam`, `fetchNextPage`, `hasNextPage`
- [CITED: rnfirebase.io/storage/usage] — RNFB v24 `putFile`, `getDownloadURL`, Task object
- [CITED: src/lib/workoutDayComputer.ts] — `parseDateOnly`, `dayOffset`, `localTodayString` — reused for adherence
- [CITED: firestore.indexes.json] — `sessions(clientId ASC, date DESC)` composite index confirmed present
- [VERIFIED: npm registry] — `expo-image-picker` 55.0.0–55.0.20 range confirmed; no postinstall script

### Secondary (MEDIUM confidence)
- [WebSearch + DEV Community] — expo-image-picker + RNFB `putFile` integration pattern; `result.assets[0].uri` usage confirmed across multiple community examples
- [TanStack/query GitHub Discussion #3167] — useInfiniteQuery + Firestore startAfter cursor pattern with `initialPageParam: undefined`

### Tertiary (LOW confidence)
- None — all critical implementation claims verified via official docs or codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Adherence algorithm: HIGH — derived from existing codebase `workoutDayComputer.ts`; no external dependencies
- Session history pagination: HIGH — TanStack v5 docs verified; existing Firestore index confirmed
- Firebase Storage upload: HIGH — RNFB v24 docs verified; package already installed
- expo-image-picker URI format: MEDIUM — official docs show unified `assets[0].uri`; platform-specific putFile compatibility tagged [ASSUMED] (A1, A2)
- Storage rules syntax: HIGH — official Firebase docs verified
- EmptyState component: HIGH — pure React Native, no external dependencies

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (Firebase Storage rules syntax is stable; TanStack v5 pagination API is stable)
