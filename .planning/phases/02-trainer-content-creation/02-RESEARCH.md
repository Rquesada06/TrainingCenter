# Phase 2: Trainer Content Creation — Research

**Researched:** 2026-06-01
**Domain:** React Native / Expo SDK 55 — Firestore data modeling, drag-and-drop reordering, multi-step forms, Cloud Function snapshot writes, program-builder grid UI
**Confidence:** HIGH (core stack), MEDIUM (drag-and-drop library recommendation — see critical note below)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **5-tab trainer nav:** Clients | Exercises | Routines | Programs | Profile — replaces current 2-tab shell.
2. **Program day model:** Week × Day 1–7 grid. `program.weeks[w].days[d]`, array index 0–6.
3. **Drag-and-drop:** `react-native-reanimated-dnd` (updated from `react-native-draggable-flatlist` — user approved switch; see Open Questions (RESOLVED) below).
4. **Snapshot:** Cloud Function `createAssignment` — server-side atomic batch write.
5. **Video display:** `Linking.openURL(videoUrl)` — external browser.
6. **Firestore collections:** top-level `exercises`, `routines`, `programs`, `assignments` with `trainerId` field (already in `firestore.rules`).
7. **File routing structure:** `src/app/trainer/` with `clients/`, `exercises/`, `routines/`, `programs/` sub-stacks as specified in CONTEXT.md.

### Claude's Discretion

- No discretion areas specified in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- Duplicate program across clients (v2 TRNR-V2-03)
- Calendar view of client program (v2 TRNR-V2-02)
- Exercise category analytics
- Session history and adherence calculation (Phase 4)
- Profile photo upload (Phase 4)
- Per-set performance logging (v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXER-01 | Create exercise: name, description, category, locationTypes, defaultSets/Reps/Duration/Rest, videoUrl, imageUrl | RHF + Zod v4 schema; `expo-image` for image display; `Linking.openURL` for video |
| EXER-02 | Edit exercise | Same form schema, pre-populated via Firestore doc read |
| EXER-03 | Delete exercise | Firestore `.delete()` with optimistic invalidation |
| EXER-04 | Search exercises by name (instant, no submit) | Client-side filter on TanStack Query cached list; `useDeferredValue` for debounce |
| EXER-05 | Filter by location type and category | Client-side filter on cached list — no additional Firestore indexes needed |
| EXER-06 | Exercises scoped to owning trainer | Firestore rule + `where('trainerId', '==', uid)` query filter both required |
| ROUT-01 | Create named routine by selecting exercises | Multi-step flow: exercise picker screen + config screen |
| ROUT-02 | Override sets/reps/duration/rest per exercise | Per-exercise fields in RHF field array |
| ROUT-03 | Add notes per exercise within a routine | Optional `notes` field in exercise entry schema |
| ROUT-04 | Reorder exercises via drag and drop | `react-native-reanimated-dnd` Sortable component (see critical note on drag library) |
| ROUT-05 | Gym/home alternative via alternativeExerciseId | Cross-collection reference; picker shows trainer's exercise list |
| ROUT-06 | Edit and delete routines | Same form + Firestore update/delete |
| ROUT-07 | List all trainer routines | TanStack Query `useQuery` + Firestore `where('trainerId', '==', uid)` |
| PROG-01 | Create program: name, description, durationWeeks | RHF + Zod; generates `weeks` array on save |
| PROG-02 | Assign routine to program day | Week × Day grid; bottom sheet picker per cell |
| PROG-03 | Mark days as rest | Same bottom sheet: 'rest' option |
| PROG-04 | Null days default to rest | `null` and `'rest'` treated identically by UI and Phase 3 |
| PROG-05 | Edit and delete programs | Firestore update/delete; snapshot not affected |
| PROG-06 | List all trainer programs | TanStack Query `useQuery` + Firestore `where('trainerId', '==', uid)` |
| ASGN-01 | Assign program to client with start date | `createAssignment` Cloud Function call |
| ASGN-02 | Warn before overwriting active assignment | Pre-check Firestore `assignments` where clientId+status=active |
| ASGN-03 | Immutable snapshot on assignment | Cloud Function server-side batch write |
| ASGN-04 | Date-only string comparison for workout day calc | `YYYY-MM-DD` string diff (Phase 3 logic, schema locked here) |
| CLNT-02 | Client list: name, photo, active program, adherence | `expo-image`, TanStack Query combined read |
| CLNT-03 | Client profile: active program, start date, sessions | Firestore compound read (user + active assignment) |
| CLNT-04 | Edit client name and photo | Firestore update; photo upload Phase 4 |
| CLNT-05 | Visual indicator when no active program | Conditional rendering based on assignment query result |
</phase_requirements>

---

## Summary

Phase 2 builds the full trainer content pipeline: exercise library, routine builder, program builder, assignment flow, and a richer client list. The stack is already installed; this phase adds two libraries (`react-native-reanimated-dnd` for drag-and-drop and `@gorhom/bottom-sheet` for the program-day picker) plus a Cloud Function.

**Critical discovery — Reanimated version mismatch with CONTEXT.md decision:** The project's `package.json` has `react-native-reanimated: 4.2.1`, but CONTEXT.md locked `react-native-draggable-flatlist`. That library targets Reanimated v2+ / v3 and has an open GitHub issue (#602) for New Architecture flickering with Reanimated v3. Reanimated v4 (the installed version) compatibility is not confirmed in any `react-native-draggable-flatlist` release notes, and Reanimated v4 uses `react-native-worklets` (also installed at 0.7.4) as its internals — a different runtime than Reanimated v3. `react-native-reanimated-dnd` is explicitly built for Reanimated v4 + worklets and all peer dependencies already match the installed versions. **The planner should flag this to the user before locking a library choice.** Research below covers both options; the recommendation is `react-native-reanimated-dnd`.

**Secondary discovery — Zod v4 installed, not v3:** `package.json` shows `zod: ^4.4.3` (installed: 4.4.3). The CLAUDE.md technology stack table shows `zod: ^3.x`. The existing code uses `z.string().email()` (v3-style, still works in v4 as a deprecated form). Phase 2 schemas must use Zod v4 API patterns.

**Primary recommendation:** Use `react-native-reanimated-dnd` Sortable component for drag-and-drop (Reanimated v4 native); use `@gorhom/bottom-sheet` for the program-day picker; implement search/filter as client-side filter on a cached TanStack Query list (no Firestore full-text search needed at MVP scale); write `createAssignment` as a v1 `functions.https.onCall` following the `createClientAccount` pattern.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Exercise CRUD | API / Backend (Firestore) | Frontend (RN screens) | Trainer-owned data; security rules enforce ownership server-side |
| Exercise search/filter | Frontend (client-side filter) | — | MVP scale (< 200 exercises per trainer); Firestore lacks native full-text search |
| Drag-to-reorder exercises | Browser / Client | — | Pure local UI state; order saved to Firestore only on routine save |
| Routine builder form | Frontend (RHF + Zustand local) | API (Firestore) | Multi-step state lives in component/store until saved |
| Program grid (week × day) | Frontend (ScrollView + grid) | API (Firestore) | Pure UI state; grid cells stored as `weeks[w].days[d]` |
| Program-day picker (bottom sheet) | Browser / Client | — | Local interaction, no network |
| Assignment snapshot | API / Backend (Cloud Function) | Firestore | Server-side for atomicity; trainer goes offline mid-write protection |
| Client list with active program | Frontend (TanStack Query) | API (Firestore) | Read-only aggregation; no server-side join needed at MVP |
| Image display (client photos) | Frontend (expo-image) | Storage (Firebase) | expo-image handles caching; upload is Phase 4 |
| Video playback | Browser / Client (Linking.openURL) | — | External browser; no native video player needed |

---

## Standard Stack

### Core (already installed)

| Library | Installed Version | Purpose | Status |
|---------|------------------|---------|--------|
| `expo` | ~55.0.26 | SDK runtime | In project [VERIFIED: package.json] |
| `react-native` | 0.83.6 | RN runtime | In project [VERIFIED: package.json] |
| `expo-router` | ~55.0.16 | File-based routing (5-tab layout) | In project [VERIFIED: package.json] |
| `@tanstack/react-query` | ^5.100.14 | Server state, Firestore query hooks | In project [VERIFIED: package.json] |
| `zustand` | ^5.0.14 | Client UI state | In project [VERIFIED: package.json] |
| `react-hook-form` | ^7.76.1 | Form management | In project [VERIFIED: package.json] |
| `@hookform/resolvers` | ^5.4.0 | Zod v4 resolver bridge | In project [VERIFIED: package.json] |
| `zod` | ^4.4.3 | Schema validation | In project [VERIFIED: package.json] — NOTE: v4, not v3 |
| `nativewind` | ^4.2.4 | Tailwind styling | In project [VERIFIED: package.json] |
| `react-native-reanimated` | 4.2.1 | Animations runtime | In project [VERIFIED: package.json] — NOTE: v4, not v3 |
| `react-native-gesture-handler` | ~2.30.0 | Gesture handling | In project [VERIFIED: package.json] |
| `react-native-worklets` | 0.7.4 | Reanimated v4 worklet runtime | In project [VERIFIED: package.json] |
| `expo-image` | ~55.0.11 | Client photo display | In project [VERIFIED: package.json] |
| `@react-native-firebase/firestore` | ^24.0.0 | Database | In project [VERIFIED: package.json] |
| `@react-native-firebase/functions` | ^24.0.0 | Cloud Function calls | In project [VERIFIED: package.json] |

### To Install for Phase 2

| Library | Latest Version | Purpose | Peer Deps Met? |
|---------|---------------|---------|----------------|
| `react-native-reanimated-dnd` | 2.0.0 | Sortable drag-and-drop list (Reanimated v4 native) | Yes — reanimated 4.2.1 >= 4.2.0, gesture-handler 2.30 >= 2.28.0, worklets 0.7.4 >= 0.7.0 [VERIFIED: npm view] |
| `@gorhom/bottom-sheet` | 5.2.14 | Program-day picker bottom sheet | Yes — reanimated >=3.16.0 or >=4.0.0- confirmed [VERIFIED: npm view peerDependencies] |

**Installation:**
```bash
npm install react-native-reanimated-dnd @gorhom/bottom-sheet
```

No EAS rebuild is required — both libraries are JS-only with gesture-handler and reanimated as peer deps (already native).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-native-reanimated-dnd` | `react-native-draggable-flatlist` (CONTEXT.md decision) | draggable-flatlist targets Reanimated v2/v3; unconfirmed Reanimated v4 support; open New Arch flicker issue #602; reanimated-dnd is purpose-built for v4 + worklets already in the project |
| `@gorhom/bottom-sheet` | RN `Modal` + custom sheet | gorhom is the ecosystem standard; Modal requires manual animation; gorhom supports Reanimated v4 explicitly since v5.x |
| Client-side search filter | Firestore `startAt`/`endAt` range query | Client-side is simpler, no extra index, sufficient for < 200 exercises per trainer |

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. Manual registry verification performed.

| Package | Registry | Age | Downloads | Source Repo | Disposition |
|---------|----------|-----|-----------|-------------|-------------|
| `react-native-reanimated-dnd` | npm | ~1 yr (created 2025-05-28) | 28,134/wk [CITED: WebSearch npm] | github.com/entropyconquers/react-native-reanimated-dnd | Approved — active repo, documented, Reanimated v4 built-in, no postinstall script [VERIFIED: npm view] |
| `@gorhom/bottom-sheet` | npm | ~6 yr (created 2020-07-31) | Very high (ecosystem standard) | github.com/gorhom/react-native-bottom-sheet | Approved — 6-year history, widely used, no postinstall script [VERIFIED: npm view] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable — all packages above tagged `[ASSUMED]` for download counts. Install commands should be reviewed before execution. Package ages and source repos are `[VERIFIED: npm view]`.*

**Warning:** `react-native-reanimated-dnd` is relatively new (created May 2025, 8 versions as of research date). This is the purpose-built Reanimated v4 alternative. If the user prefers to stay with `react-native-draggable-flatlist` (CONTEXT.md decision), document the Reanimated v4 compatibility risk and test early.

---

## Architecture Patterns

### System Architecture Diagram

```
Trainer UI
│
├── [Tab: Clients]
│     FlatList ─── useQuery(usersCollection, {trainerId==uid}) ──► Firestore users
│     each row ─── useQuery(assignments, {clientId, status=active}) ──► Firestore assignments
│     expo-image ── photoURL ──► Firebase Storage (read-only in Phase 2)
│
├── [Tab: Exercises]
│     FlatList ─── useQuery(exercises, {trainerId==uid}) ──► Firestore exercises
│     search / filter ─ client-side filter on cached list (no extra Firestore call)
│     new/edit ─── RHF + Zod schema ──► useMutation ──► Firestore.set/update
│                                                    └──► queryClient.invalidateQueries(['exercises'])
│
├── [Tab: Routines]
│     FlatList ─── useQuery(routines, {trainerId==uid}) ──► Firestore routines
│     new.tsx (multi-step)
│       Step 1: pick exercises from exercises list (local state)
│       Step 2: configure per-exercise overrides (RHF field array)
│       Step 3: reorder via Sortable drag (react-native-reanimated-dnd)
│       Save ─── useMutation ──► Firestore.set ──► invalidateQueries(['routines'])
│
├── [Tab: Programs]
│     FlatList ─── useQuery(programs, {trainerId==uid}) ──► Firestore programs
│     new.tsx ─── RHF (name, description, durationWeeks) ──► generate weeks[] skeleton
│     program grid (ScrollView + rows) ──► each cell tap opens @gorhom/bottom-sheet
│       sheet ─── pick routine from useQuery(['routines']) OR mark 'rest'
│     assign button ─── pre-check assignments query (ASGN-02 warning)
│                  └──► httpsCallable('createAssignment')({programId, clientId, startDate})
│                                         │
│                                         ▼
│                              Cloud Function createAssignment
│                              1. Verify caller is trainer
│                              2. Read program doc + all referenced routines + exercises
│                              3. Build snapshot object
│                              4. admin.firestore().batch():
│                                 - set assignments/{id} with snapshot
│                                 - (optional) update old assignment status → completed
│                              5. Return { assignmentId }
│
└── [Tab: Profile] ── unchanged from Phase 1
```

### Recommended Project Structure

```
src/
├── app/trainer/
│   ├── _layout.tsx                  ← 5-tab Tabs layout (replace existing 2-tab)
│   ├── clients/
│   │   ├── _layout.tsx              ← Stack
│   │   ├── index.tsx                ← client list (CLNT-02, CLNT-05)
│   │   ├── [clientId].tsx           ← client detail (CLNT-03, CLNT-04)
│   │   └── add.tsx                  ← add client form (CLNT-01 UI, already handled)
│   ├── exercises/
│   │   ├── _layout.tsx              ← Stack
│   │   ├── index.tsx                ← list + search/filter (EXER-04, EXER-05)
│   │   ├── new.tsx                  ← create (EXER-01)
│   │   └── [exerciseId].tsx         ← edit/delete (EXER-02, EXER-03)
│   ├── routines/
│   │   ├── _layout.tsx              ← Stack
│   │   ├── index.tsx                ← list (ROUT-07)
│   │   ├── new.tsx                  ← multi-step builder (ROUT-01–05)
│   │   └── [routineId].tsx          ← edit/delete (ROUT-06)
│   ├── programs/
│   │   ├── _layout.tsx              ← Stack
│   │   ├── index.tsx                ← list (PROG-06)
│   │   ├── new.tsx                  ← create + grid builder (PROG-01–04)
│   │   └── [programId].tsx          ← edit/delete + assign (PROG-05, ASGN-01, ASGN-02)
│   └── profile.tsx                  ← unchanged
├── firebase/
│   ├── firestore.ts                 ← add: exercisesCollection, routinesCollection, programsCollection, assignmentsCollection
│   └── functions.ts                 ← add: createAssignmentCallable
├── types/
│   ├── user.ts                      ← unchanged
│   ├── exercise.ts                  ← NEW: Exercise, CreateExerciseInput types
│   ├── routine.ts                   ← NEW: Routine, RoutineExercise types
│   ├── program.ts                   ← NEW: Program, ProgramWeek types
│   └── assignment.ts                ← NEW: Assignment, AssignmentSnapshot types
├── validation/
│   ├── auth.schema.ts               ← unchanged
│   ├── exercise.schema.ts           ← NEW: Zod v4 schema
│   ├── routine.schema.ts            ← NEW: Zod v4 schema
│   └── program.schema.ts            ← NEW: Zod v4 schema (name, description, durationWeeks)
├── services/
│   ├── user.service.ts              ← unchanged
│   ├── exercise.service.ts          ← NEW: CRUD wrappers
│   ├── routine.service.ts           ← NEW: CRUD wrappers
│   ├── program.service.ts           ← NEW: CRUD wrappers
│   └── assignment.service.ts        ← NEW: createAssignment CF caller
└── functions/src/
    └── index.ts                     ← add: createAssignment (v1 onCall)
```

### Pattern 1: Firestore collection reference pattern (follow existing `usersCollection`)

**What:** Typed collection reference function that returns a `CollectionReference<T>`.
**When to use:** Every new Firestore collection.

```typescript
// Source: src/firebase/firestore.ts pattern established in Phase 1
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Exercise } from '@/types/exercise';

export const exercisesCollection = (): FirebaseFirestoreTypes.CollectionReference<Exercise> =>
  firestore().collection('exercises') as FirebaseFirestoreTypes.CollectionReference<Exercise>;
```

### Pattern 2: TanStack Query v5 + Firestore one-time list query (no real-time subscription needed for lists)

**What:** `useQuery` with a Firestore `.get()` call. Invalidate manually after mutations.
**When to use:** Exercise list, routine list, program list — these are trainer-owned static lists that update on mutation, not real-time.

```typescript
// Source: TanStack Query v5 docs + @react-native-firebase/firestore pattern
import { useQuery } from '@tanstack/react-query';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '@/stores/authStore';

export function useExercises() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['exercises', uid],
    queryFn: async () => {
      const snap = await firestore()
        .collection('exercises')
        .where('trainerId', '==', uid)
        .orderBy('name', 'asc')
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: !!uid,
    staleTime: 30_000,  // 30 seconds — exercise lists change infrequently
  });
}
```

**Invalidation after mutation:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: (input: CreateExerciseInput) =>
      firestore().collection('exercises').add({ ...input, trainerId: uid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', uid] });
    },
  });
}
```

### Pattern 3: Zod v4 exercise form schema (complex: optional numerics, enum, array)

**What:** Zod v4 schema for an exercise with optional numeric fields, enum category, and locationTypes array.
**Key Zod v4 notes:**
- Use `z.enum([...])` not `z.nativeEnum()` (deprecated in v4) [CITED: zod.dev/v4/changelog]
- `z.string().email()` still works but is deprecated — use `z.email()` for new code
- Optional numerics: `z.number().nonnegative().optional()` or `z.coerce.number()` for string-to-number from text inputs

```typescript
// Source: Zod v4 docs (zod.dev/v4) + existing auth.schema.ts pattern
import { z } from 'zod';

const EXERCISE_CATEGORIES = ['strength', 'cardio', 'functional', 'hypertrophy', 'HIIT', 'mobility'] as const;
const LOCATION_TYPES = ['gym', 'home', 'both'] as const;

export const exerciseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(EXERCISE_CATEGORIES),
  locationTypes: z.array(z.enum(LOCATION_TYPES)).min(1, 'Select at least one location'),
  // Numeric fields from text inputs: coerce handles empty string → undefined
  defaultSets: z.coerce.number().int().positive().optional(),
  defaultReps: z.coerce.number().int().positive().optional(),
  defaultDuration: z.coerce.number().int().nonnegative().optional(),   // seconds
  defaultRest: z.coerce.number().int().nonnegative().optional(),       // seconds
  videoUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
```

**Important:** `@hookform/resolvers` v5.4.0 supports Zod v4 [CITED: github.com/react-hook-form/resolvers/releases]. Use `zodResolver(exerciseSchema)` as normal.

### Pattern 4: RHF + Zod for routine exercise overrides (field array)

**What:** A routine contains a dynamic list of exercise entries. Use `useFieldArray` from react-hook-form.

```typescript
// Source: RHF v7 docs — useFieldArray + Zod schema
const routineExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.coerce.number().int().positive(),
  reps: z.coerce.number().int().positive().optional(),
  duration: z.coerce.number().int().nonnegative().optional(),
  rest: z.coerce.number().int().nonnegative(),
  notes: z.string().optional(),
  alternativeExerciseId: z.string().optional(),
});

const routineSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(routineExerciseSchema).min(1, 'Add at least one exercise'),
});

// In component:
const { control } = useForm({ resolver: zodResolver(routineSchema) });
const { fields, append, remove, move } = useFieldArray({ control, name: 'exercises' });
```

**Drag reorder → RHF sync:** On `onDragEnd` (reanimated-dnd callback), call `move(fromIndex, toIndex)` from `useFieldArray`. [ASSUMED — API inference from field array docs]

### Pattern 5: Drag-and-drop sortable exercise list (react-native-reanimated-dnd)

**What:** Sortable exercise list in the routine builder.
**Requires:** Items must have an `id` field. `itemHeight` is fixed per item.

```typescript
// Source: react-native-reanimated-dnd docs (react-native-reanimated-dnd.netlify.app)
import { Sortable, SortableItem } from 'react-native-reanimated-dnd';

function ExerciseOrderEditor({ fields, move }) {
  return (
    <Sortable
      data={fields}                  // useFieldArray fields have a stable 'id'
      renderItem={({ item, id, positions, ...props }) => (
        <SortableItem key={id} id={id} positions={positions} {...props}>
          <ExerciseRow exercise={item} />
        </SortableItem>
      )}
      itemHeight={72}
      onOrderChange={(newOrder) => {
        // newOrder is the reordered array — sync to RHF
        // Use index-based move() calls or replace with setValue
      }}
    />
  );
}
```

### Pattern 6: Program grid (7-column week × day)

**What:** Scrollable grid where rows = weeks, columns = Day 1–7. Pure ScrollView + View layout; no FlatList needed (small data: max ~26 rows for 26 weeks).

```typescript
// Source: React Native ScrollView + View layout (no library needed)
// For a 6-week program = 6 rows × 7 columns = 42 cells — too few for virtualization
<ScrollView>
  {program.weeks.map((week, w) => (
    <View key={w} className="flex-row">
      <Text className="text-white w-12">{`W${w + 1}`}</Text>
      {week.days.map((day, d) => (
        <Pressable
          key={d}
          className="flex-1 border border-[#444] h-14 items-center justify-center mx-0.5"
          onPress={() => openDayPicker(w, d)}
        >
          <Text className="text-xs text-white">
            {day === 'rest' || day === null ? 'REST' : routineNameMap[day]}
          </Text>
        </Pressable>
      ))}
    </View>
  ))}
</ScrollView>
```

**Pitfall:** Column labels ("Day 1" through "Day 7") should live in a sticky header row, not inside the ScrollView data, to stay visible when scrolling horizontally. Wrap in a horizontal ScrollView if week labels are too wide on small screens.

### Pattern 7: createAssignment Cloud Function (v1 onCall, follows createClientAccount pattern)

```typescript
// Source: functions/src/index.ts (Phase 1 pattern — v1 onCall confirmed)
export const createAssignment = functions.https.onCall(
  async (data: CreateAssignmentInput, context) => {
    // 1. Auth check (same as createClientAccount)
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '...');

    // 2. Role check
    const callerSnap = await admin.firestore().doc(`users/${context.auth.uid}`).get();
    if (callerSnap.data()?.role !== 'trainer')
      throw new functions.https.HttpsError('permission-denied', '...');

    // 3. Read program + all routines + exercises (parallel reads)
    const programSnap = await admin.firestore().doc(`programs/${data.programId}`).get();
    const program = programSnap.data();
    if (!program || program.trainerId !== context.auth.uid)
      throw new functions.https.HttpsError('not-found', 'Program not found');

    // 4. Build snapshot (resolve all routineId references into full objects)
    const snapshot = await buildSnapshot(program);

    // 5. Batch write (single document — well within 500-op limit)
    const batch = admin.firestore().batch();
    const assignRef = admin.firestore().collection('assignments').doc();

    // Optional: mark previous active assignment as completed
    const prevQuery = await admin.firestore()
      .collection('assignments')
      .where('clientId', '==', data.clientId)
      .where('status', '==', 'active')
      .get();
    prevQuery.docs.forEach((d) => batch.update(d.ref, { status: 'completed' }));

    batch.set(assignRef, {
      trainerId: context.auth.uid,
      clientId: data.clientId,
      programId: data.programId,
      status: 'active',
      startDate: data.startDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      snapshot,
    });

    await batch.commit();
    return { assignmentId: assignRef.id };
  }
);
```

**Batch operation count:** The snapshot is written as a single Firestore document. All routine and exercise data lives inside the `snapshot` nested field — this is 1 set + N updates (to previous assignments). For a trainer with ≤ 50 clients, this is well within the 500-operation batch limit [CITED: firebase.google.com/docs/firestore/quotas — 500 field transforms per Commit, document size limit 1 MiB].

**Snapshot size check:** A 12-week program with 5 routines × 8 exercises × ~500 bytes/exercise ≈ 240 KB. Under the 1 MiB document limit. Programs larger than ~2000 exercises total would need subcollection splitting (not relevant for MVP). [ASSUMED — size estimate based on field count]

### Pattern 8: expo-image for client list photo

```typescript
// Source: docs.expo.dev/versions/latest/sdk/image/
import { Image } from 'expo-image';

<Image
  source={client.photoURL ?? require('@/assets/images/default-avatar.png')}
  style={{ width: 48, height: 48, borderRadius: 24 }}
  contentFit="cover"
  transition={200}
  placeholder={{ blurhash: client.blurhash }}  // optional, Phase 4 when uploading photos
/>
```

### Pattern 9: Routine builder multi-step flow (expo-router push stack)

**What:** The routine creation flow spans multiple logical steps but is implemented as a single screen with local state, not multi-screen navigation. This avoids complex state passing between screens.

**Recommended approach:** Single `new.tsx` screen with a local step index (0 = pick exercises, 1 = configure overrides, 2 = reorder). Zustand store for transient routine draft state OR just component `useState` since the screen is not deep.

**Alternative (if state becomes complex):** Use a dedicated `useRoutineBuilderStore` Zustand store with the draft routine state, cleared on save or cancel. This mirrors Phase 3's `useSessionStore` pattern described in STATE.md.

### Anti-Patterns to Avoid

- **Nesting DraggableFlatList inside ScrollView (same orientation):** Causes "VirtualizedLists should never be nested inside plain ScrollViews" warning and breaks windowing. Avoid wrapping the sortable list in a ScrollView. [CITED: github.com/computerjazz/react-native-draggable-flatlist/issues/393, #422]
- **Trainer ID filter only in Firestore rules, not in queries:** Rules deny unauthorized reads server-side, but without `where('trainerId', '==', uid)` in the query, the SDK will throw a Firestore permission error. Include the filter in every list query. [CITED: firestore.rules in codebase — rules enforce trainerId, but query must still specify it]
- **Client-side Firestore batch for assignment snapshot:** If the trainer goes offline between the read phase (reading program/routines/exercises) and the write phase, a partial snapshot could be written. Use the Cloud Function for atomicity (already decided in CONTEXT.md).
- **Using `z.nativeEnum()` with Zod v4:** Deprecated. Use `z.enum([...] as const)` instead. [CITED: zod.dev/v4/changelog]
- **Using `z.string().url()` for optional video URL that may be empty string:** `z.string().url()` fails on empty string. Use `.or(z.literal(''))` to accept empty strings from form inputs. [ASSUMED — standard RHF pattern]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-to-reorder exercise list | Custom pan gesture + absolute positioning | `react-native-reanimated-dnd` Sortable | Gesture conflict resolution, auto-scroll, spring animations — 300+ lines of complexity |
| Bottom sheet for day picker | RN `Modal` with custom slide animation | `@gorhom/bottom-sheet` | Keyboard avoid, backdrop dismiss, snap points, gesture handling — hours of debug |
| Full-text exercise search | Firestore `startAt`/`endAt` or Algolia | Client-side `Array.filter` on cached query | Exercise lists are < 200 items per trainer; no index overhead; instant filtering |
| Snapshot integrity | Client-side batch write | Cloud Function `createAssignment` | Offline atomicity — partial writes impossible when trainer loses connection mid-assignment |
| Trainer-owned query scoping | Custom middleware or wrapper | `where('trainerId', '==', uid)` in every query + Firestore rules | Defense-in-depth: client filter prevents UI leakage; rules prevent server-side leakage |

**Key insight:** The drag-and-drop and bottom sheet components both require deep Reanimated + gesture-handler integration that produces animation jitter and gesture conflicts when hand-rolled. The library ecosystem has solved these specific problems.

---

## Common Pitfalls

### Pitfall 1: Reanimated v4 + react-native-draggable-flatlist incompatibility

**What goes wrong:** The app installs `react-native-draggable-flatlist` (Reanimated v2/v3 API) alongside `react-native-reanimated` v4. Reanimated v4 uses `react-native-worklets` as its engine and has a different internal API. The library may throw "[Reanimated] Tried to synchronously call a non-worklet function on the UI thread" or produce New Architecture flickering on drag end.
**Why it happens:** `react-native-draggable-flatlist` was written for the Reanimated v2 `useAnimatedGestureHandler` API, which is deprecated/removed in Reanimated v4. [CITED: github.com/software-mansion/react-native-reanimated/issues/5787]
**How to avoid:** Use `react-native-reanimated-dnd` which requires Reanimated v4 + worklets (both already installed). If the user insists on `react-native-draggable-flatlist`, test on a device with New Architecture before committing.
**Warning signs:** Build succeeds but drag interactions flicker, snap incorrectly, or throw console errors about worklets.

### Pitfall 2: Zod v4 API differences (project uses v4.4.3)

**What goes wrong:** Writing `z.nativeEnum(MyEnum)` or relying on `.passthrough()` / `.strict()` behavior from v3 mental models produces TypeScript errors or unexpected runtime behavior.
**Why it happens:** Zod v4 deprecated `nativeEnum`, removed redundant enum accessors, and changed optional+default behavior. [CITED: zod.dev/v4/changelog]
**How to avoid:** Use `z.enum([...] as const)` for all enums. For optional numeric text inputs, use `z.coerce.number().optional()`. Keep `z.string().email()` (still works, deprecated). Test schema with `safeParse` in unit tests.
**Warning signs:** TypeScript error "Property 'Enum' does not exist on type ZodEnum"; runtime: optional fields returning unexpected defaults.

### Pitfall 3: Firestore query without trainerId filter causes permission-denied error

**What goes wrong:** A collection query like `firestore().collection('exercises').get()` throws a Firestore permission-denied error even for authenticated trainers.
**Why it happens:** `firestore.rules` requires `resource.data.trainerId == request.auth.uid` on read. A query without a `where('trainerId', '==', uid)` filter returns documents that may include docs owned by other trainers — Firestore rejects the entire query if any document in the result set would be denied.
**How to avoid:** Every list query for `exercises`, `routines`, `programs` MUST include `.where('trainerId', '==', uid)`. [CITED: firestore.rules in codebase]
**Warning signs:** `FirebaseError: Missing or insufficient permissions` on a list query but not on a direct `.doc(id).get()`.

### Pitfall 4: @hookform/resolvers v5 minor version type mismatch with Zod v4

**What goes wrong:** TypeScript overload matching fails at compile time with a type error about `Resolver<input<T>>` vs `Resolver<output<T>>`.
**Why it happens:** `@hookform/resolvers` v5.2.x has version-branded overload types requiring an exact minor version match. The runtime works; only types are affected. [CITED: github.com/react-hook-form/resolvers/issues/842]
**How to avoid:** Pin the form type explicitly: `useForm<z.input<typeof schema>, any, z.output<typeof schema>>()`. Already resolved in @hookform/resolvers v5.4.0 which is the installed version (5.4.0 >= 5.1.0 when Zod v4 support landed). [CITED: github.com/react-hook-form/resolvers/releases]
**Warning signs:** TypeScript compile error: "Type 'Resolver<input<T>, any, output<T>>' is not assignable to type 'Resolver<output<T>, any, output<T>>'".

### Pitfall 5: program grid column overflow on narrow screens

**What goes wrong:** 7 columns × minimum cell width overflows the screen on iPhone SE (320pt wide).
**Why it happens:** 7 equal-flex columns at 320pt ÷ 7 = ~45pt each. With a week label column, cells become too narrow for routine name labels.
**How to avoid:** Wrap the grid in a horizontal ScrollView so the grid can be wider than the screen. Show only first 3 chars of routine name in cells + a long-press tooltip. [ASSUMED — layout estimation]
**Warning signs:** Routine names truncated to a single character; cells overlap on small screens.

### Pitfall 6: Assignment snapshot document approaching 1 MiB limit

**What goes wrong:** For a very long program (26 weeks × 7 days = 182 days, many routines with many exercises), the snapshot document may approach the 1 MiB Firestore document limit.
**Why it happens:** The snapshot nests full copies of all exercise data inside the assignment document. [CITED: firebase.google.com/docs/firestore/quotas]
**How to avoid:** For MVP (Lau's client base), programs are short (4–12 weeks). Add a Cloud Function size check: if `JSON.stringify(snapshot).length > 800_000`, throw an HttpsError. [ASSUMED — safety threshold]
**Warning signs:** `FirebaseError: 3 INVALID_ARGUMENT: Document size exceeds limit` from the Cloud Function.

### Pitfall 7: Composite index missing for exercises orderBy

**What goes wrong:** Querying `exercises` with `.where('trainerId', '==', uid).orderBy('name', 'asc')` fails with a Firestore error requiring a composite index.
**Why it happens:** Firestore requires a composite index for any query combining a `where` equality filter with an `orderBy` on a different field.
**How to avoid:** Add to `firestore.indexes.json`:
```json
{
  "collectionGroup": "exercises",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "trainerId", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```
Similarly for `routines` (trainerId + name) and `programs` (trainerId + name). [CITED: firebase.google.com/docs/firestore/query-data/indexing]
**Warning signs:** `FirebaseError: The query requires an index. You can create it here: [URL]`.

---

## Code Examples

### Verified: usersCollection pattern to replicate for new collections

```typescript
// Source: src/firebase/firestore.ts — Phase 1 established pattern
export const exercisesCollection = (): FirebaseFirestoreTypes.CollectionReference<Exercise> =>
  firestore().collection('exercises') as FirebaseFirestoreTypes.CollectionReference<Exercise>;
```

### Verified: TanStack Query v5 single-object API with Firestore

```typescript
// Source: tanstack.com/query/v5/docs/framework/react/reference/useQuery
// Source: rnfirebase.io/firestore/usage
useQuery({
  queryKey: ['exercises', uid],
  queryFn: async () => { /* ... */ },
  enabled: !!uid,
})

useMutation({
  mutationFn: async (input) => { /* ... */ },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises', uid] }),
})
```

### Verified: expo-router Tab layout pattern (follow existing trainer/_layout.tsx)

```typescript
// Source: src/app/trainer/_layout.tsx (Phase 1) — extend to 5 tabs
<Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#0E0E0E' }, tabBarActiveTintColor: '#00FF66', tabBarInactiveTintColor: '#888888' }}>
  <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
  <Tabs.Screen name="exercises" options={{ title: 'Exercises' }} />
  <Tabs.Screen name="routines" options={{ title: 'Routines' }} />
  <Tabs.Screen name="programs" options={{ title: 'Programs' }} />
  <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
</Tabs>
```

### Verified: React Native Firebase onCall callable pattern

```typescript
// Source: src/firebase/functions.ts pattern (Phase 1)
import functions from '@react-native-firebase/functions';

export const createAssignmentCallable = functions().httpsCallable('createAssignment');
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.nativeEnum()` | `z.enum([...] as const)` | Zod v4 (2025) | nativeEnum deprecated; z.enum works for string unions |
| `z.string().email()` | `z.email()` (preferred) | Zod v4 (2025) | method form deprecated but still works |
| Reanimated v3 drag-and-drop | Reanimated v4 + worklets | Expo SDK 55 (2025) | `react-native-draggable-flatlist` targets v3; `react-native-reanimated-dnd` targets v4 |
| expo-av | expo-video / Linking.openURL | SDK 54 (removed SDK 55) | Already decided in CONTEXT.md |
| TanStack Query v4 `useQuery(key, fn)` | v5 `useQuery({ queryKey, queryFn })` | TanStack Query v5 (2023) | Single-object API only |

**Deprecated/outdated:**
- `z.nativeEnum()`: use `z.enum()` instead [CITED: zod.dev/v4/changelog]
- `expo-av`: removed in SDK 55; using `Linking.openURL` (already decided)
- Reanimated v3 `useAnimatedGestureHandler`: removed in v4; v4 uses gesture-handler v2 directly

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-native-draggable-flatlist` does NOT work correctly with Reanimated v4 | Common Pitfalls, Pitfall 1 | If it does work, the CONTEXT.md library decision stands and `react-native-reanimated-dnd` install is unnecessary |
| A2 | Assignment snapshot size for a 12-week program stays under 800 KB | Common Pitfalls, Pitfall 6 | If larger programs are common, the Cloud Function needs chunk logic |
| A3 | Horizontal ScrollView is needed for the 7-column program grid on small screens | Architecture Patterns, Pattern 6 | If all target devices are >= 375pt wide, a fixed flex grid may fit without horizontal scroll |
| A4 | `onOrderChange` is the correct callback on `react-native-reanimated-dnd` Sortable for syncing to RHF `move()` | Code Examples | If the callback API is different, the drag-RHF sync pattern needs adjustment |
| A5 | Client-side filter is sufficient for exercise search at MVP scale (< 200 exercises/trainer) | Don't Hand-Roll | If Lau grows to > 500 exercises, client-side filter may lag — would need Firestore range query or Algolia |
| A6 | `react-native-reanimated-dnd` v2.0.0 (28K weekly downloads) is production-ready for this use case | Package Legitimacy Audit | Library is ~1 year old; if it has undiscovered bugs in the sortable-only use case, fallback is a long-press drag gesture with RHF move() |

---

## Open Questions (RESOLVED)

1. **Drag-and-drop library — CONTEXT.md vs installed Reanimated version**
   - **RESOLVED:** User approved switching to `react-native-reanimated-dnd`. CONTEXT.md Decision 3 updated. Plans use `react-native-reanimated-dnd`.

2. **@gorhom/bottom-sheet — explicit listing in plan**
   - **RESOLVED:** Use `@gorhom/bottom-sheet` v5 (peer dep compatible with Reanimated v4). Added to Wave 1 install step in 02-01.

3. **Client photo display in CLNT-02 — photoURL availability**
   - **RESOLVED:** Implement `expo-image` with placeholder fallback (initials or default avatar). Phase 2 clients likely have null photoURL; Phase 4 adds upload.

4. **Firestore composite indexes for Phase 2 queries**
   - **RESOLVED:** User approved sorting by name A-Z. Add 3 composite indexes: exercises(trainerId ASC + name ASC), routines(trainerId ASC + name ASC), programs(trainerId ASC + name ASC). Plans include this in 02-01.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Cloud Functions dev | Yes | v24.4.0 | — |
| Firebase CLI | Deploy Cloud Function | Yes | 15.19.0 | — |
| Expo EAS dev client | Device testing (react-native-firebase) | Yes (per STATE.md) | — | — |
| Firebase Emulator | Firestore rules tests | Yes (firebase CLI installed) | — | — |
| `react-native-reanimated-dnd` | Drag-and-drop (Phase 2 add) | Not installed | 2.0.0 latest | `react-native-draggable-flatlist` if Reanimated v4 compatible |
| `@gorhom/bottom-sheet` | Program-day picker | Not installed | 5.2.14 latest | RN Modal (simpler, no animation) |

**Missing dependencies with no fallback:** None — both new libraries have fallbacks.

**Missing dependencies with fallback:**
- `react-native-reanimated-dnd`: fallback is `react-native-draggable-flatlist` if Reanimated v4 confirms compatible (recommend spike test)
- `@gorhom/bottom-sheet`: fallback is RN built-in `Modal` component

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest-expo (react-native project) + ts-jest (firestore-rules project) |
| Config file | `jest.config.js` — two projects: `react-native` (src/**) and `firestore-rules` (firestore/**) |
| Quick run command | `npx jest --testPathPattern=src --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase 2 Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXER-01 | exerciseSchema validates required name, enum category, locationTypes | unit | `npx jest --testPathPattern=exercise.schema` | Wave 0 |
| EXER-01 | exerciseSchema rejects invalid videoUrl (non-URL non-empty string) | unit | `npx jest --testPathPattern=exercise.schema` | Wave 0 |
| EXER-04/05 | Client-side filter function: search by name, filter by category/locationType | unit | `npx jest --testPathPattern=exercise.filter` | Wave 0 |
| EXER-06 | Firestore rule: trainer cannot read another trainer's exercise | integration (rules) | `firebase emulators:exec --only firestore "npx jest --testPathPattern=rules"` | ❌ Wave 0 |
| ROUT-01 | routineSchema validates exercises array min(1) | unit | `npx jest --testPathPattern=routine.schema` | Wave 0 |
| ASGN-02 | Assignment overwrite warning: query returns existing active assignment | unit | `npx jest --testPathPattern=assignment.service` | Wave 0 |
| ASGN-03 | createAssignment CF: returns assignmentId, rejects non-trainer | integration (CF emulator) | manual-only (CF emulator required) | manual |
| PROG-01 | programSchema validates name, durationWeeks >= 1 | unit | `npx jest --testPathPattern=program.schema` | Wave 0 |
| CLNT-02 | expo-image renders with null photoURL (fallback to placeholder) | component | manual-only (UI test) | manual |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=src --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green + device smoke test on Expo dev client before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/validation/__tests__/exercise.schema.test.ts` — covers EXER-01 schema validation
- [ ] `src/validation/__tests__/routine.schema.test.ts` — covers ROUT-01 schema validation
- [ ] `src/validation/__tests__/program.schema.test.ts` — covers PROG-01 schema validation
- [ ] `src/firebase/__tests__/exercise.filter.test.ts` — covers EXER-04, EXER-05 client-side filter
- [ ] `firestore/__tests__/rules.test.ts` — extend existing file with Phase 2 collection rules (exercises, routines, programs, assignments cross-trainer denial)

---

## Security Domain

> `security_enforcement: true` in config.json (ASVS Level 1)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Auth handled in Phase 1 |
| V3 Session Management | No | Session handled in Phase 1 |
| V4 Access Control | Yes | Firestore rules: `trainerId == request.auth.uid` already enforced; v1 onCall role check in Cloud Function |
| V5 Input Validation | Yes | Zod v4 schema on all form inputs; Cloud Function validates input types before Firestore write |
| V6 Cryptography | No | No new cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-trainer data leakage via missing WHERE clause | Information Disclosure | Always include `where('trainerId', '==', uid)` in queries AND verify `resource.data.trainerId` in Firestore rules (defense-in-depth) [CITED: firestore.rules] |
| Trainer assigns another trainer's program to client | Tampering | Cloud Function checks `program.trainerId == context.auth.uid` before building snapshot |
| Snapshot spoofing (client sends fabricated snapshot) | Tampering | Cloud Function builds snapshot server-side from Firestore reads — client input is only `programId`, `clientId`, `startDate` |
| Privilege escalation via assignment creation | Elevation of Privilege | Cloud Function role check (step 2): `role !== 'trainer'` throws permission-denied |
| Firestore document size DoS via large snapshot | Denial of Service | Add size check in Cloud Function; Firestore 1 MiB limit is an absolute server-side guard [CITED: firebase.google.com/docs/firestore/quotas] |
| Client submits malformed exercise form (negative reps, invalid category) | Tampering | Zod schema on client + Firestore rules on write (rules don't validate field values, but schema validation prevents malformed data reaching Firestore) |

**Security note on search/filter:** Exercise search is client-side filter on a TanStack Query cached list. The cached list is already scoped by `where('trainerId', '==', uid)` — no additional security exposure from client-side filtering.

---

## Sources

### Primary (HIGH confidence)
- `src/firebase/firestore.ts`, `src/stores/authStore.ts`, `functions/src/index.ts`, `package.json` — codebase ground truth
- `firestore.rules` — confirmed Phase 2 collections already scoped
- `firestore.indexes.json` — confirmed existing indexes, identifies missing Phase 2 indexes
- `react-native-reanimated-dnd` docs: react-native-reanimated-dnd.netlify.app
- `@gorhom/bottom-sheet` peerDependencies: [VERIFIED: npm view]
- Zod v4 changelog: zod.dev/v4/changelog

### Secondary (MEDIUM confidence)
- TanStack Query v5 React Native docs: tanstack.com/query/v5/docs/framework/react/react-native
- @react-native-firebase Firestore docs: rnfirebase.io/firestore/usage
- Expo Image docs: docs.expo.dev/versions/latest/sdk/image/
- `react-native-draggable-flatlist` GitHub issues #602, #393, #422 — New Arch flicker and ScrollView nesting

### Tertiary (LOW confidence / marked [ASSUMED])
- Snapshot size estimates (A2)
- Grid overflow behavior on small screens (A3)
- `onOrderChange` callback name for react-native-reanimated-dnd (A4)
- Client-side filter scale threshold (A5)

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint for Phase 2 |
|-----------|----------------------|
| Tech Stack: non-negotiable | React Native (Expo SDK 55+), Firebase Auth/Firestore/Storage/Functions, expo-router, react-query, zustand, react-hook-form + zod, NativeWind |
| Navigation: expo-router | 5-tab layout and sub-stacks must be file-based routes in `src/app/trainer/` |
| State: react-query + zustand | No alternative state management for server data; local form draft state uses zustand or component state |
| Forms: react-hook-form + zod | All forms use RHF with zodResolver; no alternative form libraries |
| UI: NativeWind, Obsidian Performance theme | bg `#0E0E0E`, accent `#00FF66`, muted `#888888`, surface `#1A1A1A` — no off-theme colors |
| Firebase: @react-native-firebase | NOT the web `firebase` JS SDK; import from `@react-native-firebase/*` |
| NativeWind: v4 (tailwindcss v3) | Do not upgrade to NativeWind v5 or tailwindcss v4 |
| Cloud Functions: v1 onCall | NOT v2 — auth propagation bug with @react-native-firebase/functions.httpsCallable() |
| Node.js 20 for Functions | Node 22 not yet GA on Firebase Functions as of May 2026 (STATE.md) — keep Node 20 |
| Zod: v4 installed | CLAUDE.md table shows v3 but installed version is v4.4.3; use Zod v4 API patterns |
| `react-native-reanimated`: v4 installed | CLAUDE.md table shows v3; installed is v4.2.1; affects drag-and-drop library choice |

---

## Metadata

**Confidence breakdown:**
- Standard stack (existing): HIGH — verified from package.json
- New packages (reanimated-dnd, gorhom/bottom-sheet): MEDIUM — packages confirmed on npm, peer deps verified, slopcheck unavailable
- Architecture patterns: HIGH — follow established Phase 1 patterns
- Firestore query patterns: HIGH — verified against rnfirebase.io docs
- Zod v4 schema patterns: HIGH — verified against zod.dev/v4/changelog
- Drag-and-drop library recommendation: MEDIUM — compatibility claim needs user decision (see Open Question 1)
- Pitfalls: HIGH — confirmed via GitHub issues and official docs

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable stack; Reanimated v4 ecosystem may evolve)
