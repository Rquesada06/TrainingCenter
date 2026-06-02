---
phase: 02-trainer-content-creation
plan: 02
subsystem: exercises
tags: [firestore-crud, tanstack-query-v5, react-hook-form, zod-v4, nativewind, expo-router, tdd]

# Dependency graph
requires:
  - phase: 02-01
    provides: Exercise types, exerciseSchema, filterExercises, exercisesCollection, 5-tab shell placeholder
provides:
  - Exercise CRUD service (listExercises, getExercise, createExercise, updateExercise, deleteExercise)
  - TanStack Query v5 hooks (useExercises, useCreateExercise, useUpdateExercise, useDeleteExercise)
  - Shared ExerciseForm component (RHF + zodResolver)
  - ExerciseListItem + ExerciseFilterBar components
  - Full exercise library UI (index / new / [exerciseId] screens)
affects: [02-03-clients, 02-04-routines, 02-05-programs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TanStack Query v5 single-object API: useQuery({ queryKey, queryFn, enabled, staleTime })"
    - "useMutation with invalidateQueries({ queryKey: ['exercises', uid] }) on success"
    - "RHF useForm<z.input<typeof schema>, unknown, z.output<typeof schema>> to avoid Pitfall 4 resolver type mismatch"
    - "jest.mock factory creates all mock fns internally to avoid jest hoisting TDZ; mocks exposed via firestoreFn.__mocks and retrieved with jest.requireMock()"
    - "firestore.FieldValue.serverTimestamp() accessed as static property on mock callable"

key-files:
  created:
    - src/services/exercise.service.ts
    - src/services/__tests__/exercise.service.test.ts
    - src/hooks/useExercises.ts
    - src/hooks/useCreateExercise.ts
    - src/hooks/useUpdateExercise.ts
    - src/hooks/useDeleteExercise.ts
    - src/components/exercises/ExerciseForm.tsx
    - src/components/exercises/ExerciseListItem.tsx
    - src/components/exercises/ExerciseFilterBar.tsx
    - src/app/trainer/exercises/new.tsx
    - src/app/trainer/exercises/[exerciseId].tsx
  modified:
    - src/app/trainer/exercises/index.tsx (replaced placeholder)

key-decisions:
  - "jest mock factory creates internal fns to avoid TDZ hoisting issue — FieldValue.serverTimestamp attached as static property on the callable mock; mocks exposed via __mocks and retrieved with jest.requireMock()"
  - "expo-router typed-routes cache regenerated via brief expo start — same Deviation #2 pattern as Plan 02-01"
  - "ExerciseFilterBar uses inline style (not NativeWind className) for chip components to avoid runtime CSS class resolution issues with dynamic selected state"

# Metrics
duration: ~12min
completed: 2026-06-02
---

# Phase 2 Plan 02: Exercise Library Summary

**Full trainer exercise library: Firestore CRUD service + TanStack Query hooks + RHF form + filter bar + list/create/edit/delete screens with 6 tests green and TypeScript clean.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-02T16:50:08Z
- **Completed:** 2026-06-02T17:02:24Z (approx)
- **Tasks:** 3 (Task 1 TDD, Tasks 2-3 auto)
- **Files modified/created:** 12

## Accomplishments

- `exercise.service.ts`: 5 pure async CRUD functions (listExercises, getExercise, createExercise, updateExercise, deleteExercise). `listExercises` includes mandatory `where('trainerId', '==', uid)` filter (EXER-06 / T-02-01 defense-in-depth).
- `exercise.service.test.ts`: 6 tests (RED→GREEN TDD cycle). Mock factory pattern with `__mocks` on the callable and `jest.requireMock()` for retrieval — avoids jest hoisting TDZ issue with `firestore.FieldValue`.
- `useExercises.ts`: TanStack Query v5 `useQuery` with `staleTime: 30_000` and uid-scoped `queryKey`.
- `useCreateExercise`, `useUpdateExercise`, `useDeleteExercise`: `useMutation` with `invalidateQueries({ queryKey: ['exercises', uid] })` on success.
- `ExerciseForm.tsx`: Shared form component with RHF Controller for all 10 EXER-01 fields; category and locationType chip selectors; explicit `z.input/z.output` resolver types (Pitfall 4); delete button variant for EXER-03.
- `ExerciseListItem.tsx`: Pressable row showing name, category, locationTypes.
- `ExerciseFilterBar.tsx`: TextInput with `onChangeText` for instant search (EXER-04); horizontal ScrollView chip rows for category + locationType (EXER-05).
- `exercises/index.tsx`: FlatList with `filterExercises` in `useMemo` for instant client-side filter; loading/empty states.
- `exercises/new.tsx`: ExerciseForm + useCreateExercise + router.back() on success.
- `exercises/[exerciseId].tsx`: Single-doc `useQuery`, pre-populated form, useUpdateExercise + useDeleteExercise with `Alert.alert` confirmation; permission-denied caught and treated as not-found (T-02-02).

## Exported Service Signatures

```ts
listExercises(uid: string): Promise<Exercise[]>
getExercise(id: string): Promise<Exercise | null>
createExercise(args: { trainerId: string; input: CreateExerciseInput }): Promise<string>
updateExercise(id: string, partial: Partial<CreateExerciseInput>): Promise<void>
deleteExercise(id: string): Promise<void>
```

## Hook Names

| Hook | Returns | Cache Key |
|------|---------|-----------|
| `useExercises` | `UseQueryResult<Exercise[]>` | `['exercises', uid]` |
| `useCreateExercise` | `UseMutationResult` | invalidates `['exercises', uid]` |
| `useUpdateExercise` | `UseMutationResult` | invalidates `['exercises', uid]` |
| `useDeleteExercise` | `UseMutationResult` | invalidates `['exercises', uid]` |

## Screens Implemented

| Route | Purpose | Min Lines |
|-------|---------|-----------|
| `/trainer/exercises` | List with search + filter | 100 |
| `/trainer/exercises/new` | Create exercise | 46 |
| `/trainer/exercises/[exerciseId]` | Edit + delete exercise | 130 |

## Filter Performance Notes

Client-side filter via `filterExercises()` applied to TanStack Query cached list on every search/filter state change. No Firestore round-trips. Performance is instantaneous at expected MVP scale (<200 exercises per trainer per RESEARCH.md A5). For >500 exercises, a Firestore `startAt`/`endAt` range query would be needed.

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| exercise.service.test.ts | 6 | PASS |
| exercise.schema.test.ts | existing | PASS |
| exercise.filter.test.ts | existing | PASS |
| **Total (src project)** | **37** | **PASS** |

(+6 new tests from Plan 02-02; 31 existing tests all still passing)

## Task Commits

1. **Task 1 RED — failing exercise service tests** - `2f9f052`
2. **Task 1 GREEN — exercise service + TanStack Query hooks** - `a0b972a`
3. **Task 2 — ExerciseForm + ExerciseListItem + ExerciseFilterBar** - `5d034d1`
4. **Task 3 — exercises index/new/[exerciseId] screens** - `f5697fc`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jest.mock() factory refactored to avoid hoisting TDZ on firestore.FieldValue**
- **Found during:** Task 1 GREEN (exercise service tests)
- **Issue:** The original test had `const mockServerTimestamp = jest.fn()` at module level and used it inside `jest.mock()` factory. Jest hoists `jest.mock()` to run before const declarations; the `FieldValue.serverTimestamp` property on the mock function was `undefined` when the service called it, causing `TypeError: _firestore.default.FieldValue.serverTimestamp is not a function`.
- **Fix:** Rewrote the mock factory to create all mock functions internally (no external variable references). Exposed mocks via `firestoreFn.__mocks` object and retrieved with `jest.requireMock()` in the test body. Added `FieldValue` as a static property on the callable mock function directly.
- **Files modified:** `src/services/__tests__/exercise.service.test.ts`
- **Commit:** `a0b972a`

**2. [Rule 3 - Blocking] Regenerated stale expo-router typed-routes cache**
- **Found during:** Task 3 (exercise screens)
- **Issue:** TypeScript TS2345 errors on `router.push('/trainer/exercises/new')` and `/trainer/exercises/${item.id}` — the `.expo/types/router.d.ts` cache predated the new route files.
- **Fix:** Briefly started `expo start` to trigger typed-routes generator, then stopped it. Same Deviation #2 pattern as Plan 02-01.
- **Files modified:** none committed (`.expo/` is gitignored)
- **Verification:** `npx tsc --noEmit` exits 0 after regeneration.

---

**Total deviations:** 2 (both Rule 1/3 auto-fixes; no architectural changes)
**Impact on plan:** Both necessary for correct tests and clean compile. No scope creep.

## Known Stubs

None. All screens are fully wired:
- `index.tsx`: data from `useExercises` + `filterExercises` (not mock/placeholder)
- `new.tsx`: `useCreateExercise` mutation connected to Firestore
- `[exerciseId].tsx`: `useQuery` for doc fetch + `useUpdateExercise` + `useDeleteExercise`

## Threat Flags

No new security surface introduced beyond what the plan's threat model covered:
- T-02-01 mitigated: `listExercises` includes `where('trainerId', '==', uid)` ✓
- T-02-02 mitigated: `[exerciseId].tsx` catches `firestore/permission-denied` → renders "not found" ✓
- T-02-04 mitigated: `createExercise` sets `trainerId` from `uid` (not form input) ✓
- T-02-06 mitigated: `zodResolver(exerciseSchema)` validates all inputs before any Firestore write ✓

## Self-Check: PASSED
