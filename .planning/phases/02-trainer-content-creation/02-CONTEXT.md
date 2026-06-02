---
phase: 02-trainer-content-creation
type: context
created: 2026-05-28
status: complete
---

# Phase 2 Context: Trainer Content Creation

**Phase Goal:** The trainer can build an exercise library, compose routines from those exercises, assemble multi-week programs from those routines, and assign a complete program snapshot to a client.

---

## Decisions

### 1. Trainer Navigation Structure

**Decision:** 5 tabs — Clients | Exercises | Routines | Programs | Profile.

- The current 2-tab shell (Dashboard + Profile) is replaced.
- The **Clients** tab becomes the trainer's primary dashboard: client list showing name, photo, active program, and adherence indicator (CLNT-02, CLNT-05).
- The **Exercises**, **Routines**, and **Programs** tabs each own a list screen + push-stack sub-screens.
- **Profile** tab stays as the last tab.

**File routing implication:**
```
src/app/trainer/
  _layout.tsx          ← Tabs: clients | exercises | routines | programs | profile
  clients/
    _layout.tsx        ← Stack
    index.tsx          ← client list (CLNT-02, CLNT-05)
    [clientId].tsx     ← client detail (CLNT-03, CLNT-04)
    add.tsx            ← add client form → calls createClientAccount CF (CLNT-01 UI)
  exercises/
    _layout.tsx        ← Stack
    index.tsx          ← exercise list with search + filter (EXER-04, EXER-05)
    new.tsx            ← create exercise (EXER-01)
    [exerciseId].tsx   ← edit/delete exercise (EXER-02, EXER-03)
  routines/
    _layout.tsx        ← Stack
    index.tsx          ← routine list (ROUT-07)
    new.tsx            ← create routine (ROUT-01 through ROUT-05)
    [routineId].tsx    ← edit/delete routine (ROUT-06)
  programs/
    _layout.tsx        ← Stack
    index.tsx          ← program list (PROG-06)
    new.tsx            ← create program (PROG-01 through PROG-04)
    [programId].tsx    ← edit/delete + assign (PROG-05, ASGN-01, ASGN-02)
  profile.tsx          ← unchanged
```

---

### 2. Program Day Model

**Decision:** Week × Day 1–7 grid. Days are numbered (not Mon–Sun labels).

**Data model:**
```
programs/{programId}
  name: string
  description: string
  trainerId: string
  durationWeeks: number
  weeks: [                        // array, length = durationWeeks
    {
      days: [                     // array of 7 items (index 0–6 = Day 1–7)
        routineId | 'rest' | null // null = unassigned (defaults to rest in Phase 3)
      ]
    }
  ]
  createdAt: Timestamp
  updatedAt: Timestamp
```

**Phase 3 workout calculator (decided now, implemented in Phase 3):**
```
offset = diffDays(today, startDate)   // YYYY-MM-DD string comparison
w = Math.floor(offset / 7)           // 0-indexed week
d = offset % 7                       // 0-indexed day within week
routine = assignment.snapshot.weeks[w]?.days[d] ?? 'rest'
```

`null` days display the same as `'rest'` to the client (PROG-04: days with no assigned routine default to rest).

**UI:** Program builder shows a scrollable grid — rows = weeks, columns = Day 1–7. Tapping a cell opens a bottom sheet to pick a routine or mark rest.

---

### 3. Drag-and-Drop Library

**Decision:** `react-native-reanimated-dnd` (updated from `react-native-draggable-flatlist`)

**Why updated:** Researcher found `react-native-reanimated v4.2.1` is installed (not v3). `react-native-draggable-flatlist` has an open New Architecture flicker bug (#602) against Reanimated v4. `react-native-reanimated-dnd` is purpose-built for Reanimated v4 + worklets.

- Both `react-native-reanimated` (4.2.1) and `react-native-worklets` (0.7.4) already installed — peer deps satisfied.
- Long-press on an exercise row activates drag; `onDragEnd` updates local order state.
- Order is stored as the array index in `routine.exercises[]`.

**Installation:** `npm install react-native-reanimated-dnd` (JS-only, no native rebuild needed).

---

### 4. Snapshot Implementation (ASGN-03)

**Decision:** Cloud Function `createAssignment` — server-side atomic batch write.

**Why Cloud Function over client-side batch:**
- Atomic: partial writes are impossible if the trainer goes offline mid-assignment.
- Consistent with existing `createClientAccount` pattern.
- Keeps Firestore read logic off the client for a potentially large program.

**Snapshot shape stored in Firestore:**
```
assignments/{assignmentId}
  trainerId: string
  clientId: string
  programId: string          // reference to original (for audit only)
  status: 'active' | 'completed'
  startDate: string          // YYYY-MM-DD
  createdAt: Timestamp
  snapshot: {
    name: string
    description: string
    durationWeeks: number
    weeks: [
      {
        days: [
          {
            type: 'rest' | 'routine' | null
            routineId: string | null          // original ref (audit)
            routine: {                        // full copy
              name: string
              exercises: [
                {
                  exerciseId: string          // original ref (audit)
                  name: string
                  sets: number
                  reps: number | null
                  duration: number | null     // seconds
                  rest: number               // seconds
                  notes: string | null
                  locationTypes: ('gym' | 'home' | 'both')
                  videoUrl: string | null
                  imageUrl: string | null
                  alternativeExerciseId: string | null
                  alternativeExercise: { ... } | null  // full copy if present
                }
              ]
            }
          }
        ]
      }
    ]
  }
```

**Warning on overwrite (ASGN-02):** Before calling `createAssignment`, the client queries `assignments` for `clientId == target && status == 'active'`. If one exists, show a confirmation modal before proceeding.

**Cloud Function signature:**
```ts
httpsCallable('createAssignment')({
  programId: string,
  clientId: string,
  startDate: string   // YYYY-MM-DD
})
→ { assignmentId: string }
```

---

### 5. Video Display (EXER-01)

**Decision:** `Linking.openURL(videoUrl)` — open in external browser or native YouTube/Vimeo app.

- No new native dependency, no EAS rebuild.
- Exercise detail screen shows a thumbnail (static image or URL-derived thumbnail) with a play-button overlay.
- Tapping the thumbnail calls `Linking.openURL(exercise.videoUrl)`.
- Image URL (`exercise.imageUrl`) is displayed via `expo-image` (already in stack).

---

### 6. Exercise Sort Order

**Decision:** Sort by name A-Z.

Requires 1 new composite Firestore index: `exercises(trainerId ASC, name ASC)`. Add to `firestore.indexes.json`.

Routines and programs also sort by name A-Z — same index pattern applies.

---

## Firestore Collections (Phase 2 additions)

All collections are top-level with `trainerId` field (already scoped in `firestore.rules`). No security rule changes needed for Phase 2.

**New composite indexes required (add to `firestore.indexes.json`):**
- `exercises`: `trainerId ASC` + `name ASC`
- `routines`: `trainerId ASC` + `name ASC`
- `programs`: `trainerId ASC` + `name ASC`
- `users`: `role ASC` + `trainerId ASC` + `name ASC` ← required for `listClients` query (`.where('role','==','client').where('trainerId','==',uid).orderBy('name')`)

```
exercises/{exerciseId}
  trainerId, name, description, category, locationTypes,
  defaultSets, defaultReps, defaultDuration, defaultRest,
  videoUrl, imageUrl, createdAt, updatedAt

routines/{routineId}
  trainerId, name, exercises[{exerciseId, sets, reps, duration,
  rest, notes, alternativeExerciseId, order}], createdAt, updatedAt

programs/{programId}
  trainerId, name, description, durationWeeks, weeks[{days[routineId|'rest'|null]}],
  createdAt, updatedAt

assignments/{assignmentId}
  trainerId, clientId, programId, status, startDate, snapshot{...}, createdAt
```

---

## Reusable Assets from Phase 1

| Asset | File | Reuse in Phase 2 |
|-------|------|-----------------|
| `PrimaryButton` | `src/components/ui/PrimaryButton.tsx` | CTAs on all create/edit forms |
| `TextField` | `src/components/ui/TextField.tsx` | Exercise, routine, program forms |
| `authStore` | `src/stores/authStore.ts` | `uid` + `trainerId` for all Firestore scoping |
| `usersCollection` | `src/firebase/firestore.ts` | Client detail reads |
| RHF + zod pattern | `src/validation/auth.schema.ts` | Template for exercise/routine/program schemas |
| Obsidian Performance theme | `src/constants/theme.ts` | `#0E0E0E` bg, `#00FF66` accent, `#888888` muted |

---

## Out of Scope for Phase 2

- Client-side workout execution (Phase 3)
- Session history and adherence calculation (Phase 4 — HIST-04)
- Profile photo upload (Phase 4 — PROF-02, PROF-03)
- Per-set performance logging (v2 requirement)

---

## Deferred Ideas

| Idea | Reason deferred |
|------|----------------|
| Duplicate program across clients | v2 TRNR-V2-03 — not MVP |
| Calendar view of client program | v2 TRNR-V2-02 — not MVP |
| Exercise category analytics | No requirements for MVP |

---

*Decisions captured: 2026-05-28*
*Ready for: /gsd-plan-phase 2*
