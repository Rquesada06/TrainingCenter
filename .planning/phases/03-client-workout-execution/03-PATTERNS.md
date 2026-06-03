# Phase 3: Client Workout Execution — Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 18 new/modified files
**Analogs found:** 17 / 18

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/types/session.ts` | model | — | `src/types/assignment.ts` | role-match |
| `src/firebase/firestore.ts` (modify) | config | — | `src/firebase/firestore.ts` (existing) | exact |
| `src/services/session.service.ts` | service | CRUD + request-response | `src/services/exercise.service.ts` | exact |
| `src/hooks/useClientActiveAssignment.ts` | hook | request-response | `src/hooks/useExercises.ts` | exact |
| `src/hooks/useTodaySession.ts` | hook | request-response | `src/hooks/useExercises.ts` | exact |
| `src/hooks/useFinishSession.ts` | hook | request-response | `src/hooks/useCreateExercise.ts` | exact |
| `src/stores/sessionStore.ts` | store | event-driven + persist | `src/stores/authStore.ts` | role-match |
| `src/lib/workoutDayComputer.ts` | utility | transform | `src/firebase/exerciseFilter.ts` | role-match |
| `src/lib/variantResolver.ts` | utility | transform | `src/firebase/exerciseFilter.ts` | role-match |
| `src/app/client/index.tsx` (modify) | screen | request-response | `src/app/trainer/exercises/index.tsx` | role-match |
| `src/app/client/workout/_layout.tsx` | config | — | `src/app/trainer/exercises/_layout.tsx` | exact |
| `src/app/client/workout/session.tsx` | screen | event-driven | `src/app/trainer/exercises/index.tsx` | role-match |
| `src/app/client/workout/celebration.tsx` | screen | request-response | `src/app/trainer/exercises/index.tsx` | role-match |
| `src/components/workout/ExerciseRow.tsx` | component | event-driven | `src/components/routines/RoutineExerciseRow.tsx` + `src/components/exercises/ExerciseListItem.tsx` | role-match |
| `src/components/workout/GymHomeToggle.tsx` | component | event-driven | `src/components/exercises/ExerciseListItem.tsx` | partial-match |
| `src/components/workout/FinishButton.tsx` | component | event-driven | `src/components/ui/PrimaryButton.tsx` | role-match |
| `src/components/workout/HomeStateCards.tsx` | component | request-response | `src/components/exercises/ExerciseListItem.tsx` | partial-match |
| Unit tests (4 new test files) | test | — | `src/services/__tests__/exercise.service.test.ts` + `src/stores/__tests__/authStore.test.ts` | exact |

---

## Pattern Assignments

### `src/types/session.ts` (model)

**Analog:** `src/types/assignment.ts`

**Pattern:** TypeScript interface with JSDoc, Firestore `null`-over-`undefined` discipline, `id` as top-level field.

**Imports pattern** (assignment.ts lines 1-15):
```typescript
/**
 * Session type contracts — Phase 03
 *
 * Session fields use `null` (not `undefined`) because Firestore stores
 * `null` but drops `undefined` (CONTEXT.md, RESEARCH.md).
 */
```

**Core shape** (mirror of RESEARCH.md Pattern 10):
```typescript
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
  /** Optional: routine name from snapshot for display */
  routineName: string | null;
}
```

---

### `src/firebase/firestore.ts` (modify — add sessionsCollection)

**Analog:** `src/firebase/firestore.ts` (lines 28-54, existing typed refs pattern)

**Exact pattern to copy** (firestore.ts lines 52-54):
```typescript
export const assignmentsCollection = (): FirebaseFirestoreTypes.CollectionReference<Assignment> =>
  firestore().collection('assignments') as FirebaseFirestoreTypes.CollectionReference<Assignment>;
```

**New line to add** (mirror pattern exactly):
```typescript
import type { Session } from '@/types/session';

export const sessionsCollection = (): FirebaseFirestoreTypes.CollectionReference<Session> =>
  firestore().collection('sessions') as FirebaseFirestoreTypes.CollectionReference<Session>;
```

Add import alongside the existing type imports (lines 14-19). Add `sessionsCollection` after `assignmentsCollection` (after line 54).

---

### `src/services/session.service.ts` (service, CRUD + request-response)

**Analog:** `src/services/exercise.service.ts` (lines 1-103) AND `src/services/client.service.ts` (lines 91-105)

**Imports pattern** (exercise.service.ts lines 13-18):
```typescript
import firestore from '@react-native-firebase/firestore';
import { assignmentsCollection, sessionsCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';
```

**Read / query pattern — `querySnap.empty` guard** (client.service.ts lines 91-105):
```typescript
export async function findActiveAssignmentForClient(
  clientId: string,
  trainerId: string
): Promise<Assignment | null> {
  const snap = await assignmentsCollection()
    .where('trainerId', '==', trainerId)
    .where('clientId', '==', clientId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.docs.length === 0) return null;  // Phase 2 uses .length; Phase 3 RESEARCH uses snap.empty — both valid
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Assignment;
}
```

**Critical difference:** `findMyActiveAssignment` drops `trainerId` filter — the client reads their OWN assignment. The Firestore rule `isClient() && resource.data.clientId == request.auth.uid` does NOT require a trainerId filter. Use `querySnap.empty` (RNFB v24 property):

```typescript
// Client-scoped — no trainerId filter (RESEARCH.md Pattern 3)
export async function findMyActiveAssignment(clientId: string): Promise<Assignment | null> {
  const snap = await assignmentsCollection()
    .where('clientId', '==', clientId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;  // querySnap.empty — RNFB v24, not snap.docs.length
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Assignment;
}
```

**Duplicate guard query** (RESEARCH.md Pattern 4 + client.service.ts pattern):
```typescript
export async function findTodaySession(clientId: string, todayStr: string): Promise<Session | null> {
  const snap = await sessionsCollection()
    .where('clientId', '==', clientId)
    .where('date', '==', todayStr)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Session;
}
```

**Write pattern** (exercise.service.ts lines 67-79, adapted — note NO serverTimestamp append; startedAt/completedAt are ISO strings set client-side):
```typescript
export async function createSession(data: Omit<Session, 'id'>): Promise<string> {
  const ref = await sessionsCollection().add(stripUndefinedDeep(data));
  return ref.id;
}
```

Note: `stripUndefinedDeep` wraps the data argument directly (no spread + serverTimestamp, unlike exercise.service — session timestamps are ISO strings already in `data`).

---

### `src/hooks/useClientActiveAssignment.ts` (hook, request-response)

**Analog:** `src/hooks/useExercises.ts` (lines 1-25) — exact structural match

**Full pattern** (useExercises.ts lines 12-25):
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { listExercises } from '@/services/exercise.service';

export function useExercises() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['exercises', uid],
    queryFn: () => listExercises(uid!),
    enabled: !!uid,
    staleTime: 30_000,
  });
}
```

**Phase 3 adaptation** (swap service + queryKey):
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { findMyActiveAssignment } from '@/services/session.service';

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

---

### `src/hooks/useTodaySession.ts` (hook, request-response)

**Analog:** `src/hooks/useExercises.ts` (lines 12-25)

**Adaptation** (two inputs: uid + today):
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { findTodaySession } from '@/services/session.service';
import { localTodayString } from '@/lib/workoutDayComputer';

export function useTodaySession() {
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();
  return useQuery({
    queryKey: ['todaySession', uid, today],
    queryFn: () => findTodaySession(uid!, today),
    enabled: !!uid,
    staleTime: 5_000,  // short — this is the duplicate guard; freshness matters
  });
}
```

---

### `src/hooks/useFinishSession.ts` (hook, request-response — mutation)

**Analog:** `src/hooks/useCreateExercise.ts` (lines 1-25) — exact structural match

**Full analog** (useCreateExercise.ts lines 10-25):
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createExercise } from '@/services/exercise.service';
import type { CreateExerciseInput } from '@/types/exercise';

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: (input: CreateExerciseInput) => createExercise({ trainerId: uid!, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', uid] });
    },
  });
}
```

**Phase 3 adaptation** (mutationFn takes session data directly; invalidate todaySession):
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createSession } from '@/services/session.service';
import { localTodayString } from '@/lib/workoutDayComputer';
import type { Session } from '@/types/session';

export function useFinishSession() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();

  return useMutation({
    mutationFn: (data: Omit<Session, 'id'>) => createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', uid, today] });
    },
  });
}
```

---

### `src/stores/sessionStore.ts` (store, event-driven + persist)

**Analog:** `src/stores/authStore.ts` (lines 1-74) — Zustand v5 structure

**Zustand v5 create pattern** (authStore.ts lines 42-63):
```typescript
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export const useAuthStore = create<AuthState>((setFn) => ({
  uid: null,
  role: null,
  // ...initial state...
  set: (partial) => setFn(partial),
  clear: () => setFn({ uid: null, role: null, trainerId: null, isLoaded: true }),
}));
```

**Phase 3 addition:** wrap with `persist` middleware (authStore does NOT use persist — sessionStore is the first persist usage in this codebase):
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSessionStore = create<LocalSessionState & SessionStoreActions>()(
  persist(
    (set, get) => ({
      // ...INITIAL state spread...
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
      partialize: (s) => ({
        // exclude action functions — only persist data fields
        clientId: s.clientId, date: s.date, weekIndex: s.weekIndex,
        dayIndex: s.dayIndex, assignmentId: s.assignmentId,
        mode: s.mode, completedExerciseIds: s.completedExerciseIds,
        startedAt: s.startedAt, isActive: s.isActive,
      }),
    }
  )
);
```

**Hydration gate pattern** (from RESEARCH.md Pattern 5):
```typescript
// In any component that reads isActive / completedExerciseIds:
const [hydrated, setHydrated] = React.useState(false);
React.useEffect(() => {
  const unsub = useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  if (useSessionStore.persist.hasHydrated()) setHydrated(true);
  return unsub;
}, []);
```

**Stale-date clear pattern** (on `client/index.tsx` mount — before resume evaluation):
```typescript
// Check if persisted session is from a previous day
const sessionDate = useSessionStore((s) => s.date);
const clearSession = useSessionStore((s) => s.clearSession);
React.useEffect(() => {
  if (sessionDate !== null && sessionDate !== localTodayString()) {
    clearSession();
  }
}, []);
```

---

### `src/lib/workoutDayComputer.ts` (utility, transform)

**Analog:** `src/firebase/exerciseFilter.ts` (lines 1-50) — pure function module with no React, exported named function(s), JSDoc header.

**Pure function module structure** (exerciseFilter.ts lines 1-10):
```typescript
/**
 * Exercise client-side filter — Phase 02 Plan 01 (EXER-04, EXER-05).
 *
 * Pure function applied to an already-fetched exercise list ...
 * All active filters combine with AND semantics.
 */

import type { Exercise, ExerciseCategory, LocationType } from '@/types/exercise';

export interface ExerciseFilters { ... }

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] { ... }
```

**Phase 3 adaptation** — same module discipline, different logic:
```typescript
/**
 * workoutDayComputer — Phase 03
 *
 * Pure functions for date-only arithmetic and workout-day state derivation.
 * No React, no Firebase — consumed by useClientActiveAssignment + Home screen.
 */

import type { Assignment } from '@/types/assignment';
import type { AssignmentSnapshotDay } from '@/types/assignment';

export type WorkoutDayResult =
  | { state: 'no_assignment' }
  | { state: 'starts_soon'; daysUntilStart: number }
  | { state: 'rest' }
  | { state: 'program_complete' }
  | { state: 'active'; weekIndex: number; dayIndex: number; day: AssignmentSnapshotDay };

/** Parse "YYYY-MM-DD" as local midnight — avoids UTC interpretation drift. */
export function parseDateOnly(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight, NOT UTC
}

/** Get today as YYYY-MM-DD in local time (NOT .toISOString() which is UTC). */
export function localTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeTodayWorkout(
  assignment: Assignment,
  todayStr: string
): WorkoutDayResult { ... }
```

---

### `src/lib/variantResolver.ts` (utility, transform)

**Analog:** `src/firebase/exerciseFilter.ts` (lines 1-50) — same pure function module pattern

**Module structure** — same JSDoc header + named export pattern:
```typescript
/**
 * variantResolver — Phase 03
 *
 * Pure function: given a snapshot exercise and a workout mode, returns the
 * correct exercise variant to display plus an optional mode-tag (D-08, D-10).
 * No React, no Firebase.
 */

import type { AssignmentSnapshotExercise } from '@/types/assignment';

export type WorkoutMode = 'gym' | 'home';

export interface ResolvedExercise {
  exercise: AssignmentSnapshotExercise;
  modeTag: 'gym_only' | 'home_only' | null;
}

export function resolveVariant(
  primary: AssignmentSnapshotExercise,
  mode: WorkoutMode
): ResolvedExercise { ... }
```

---

### `src/app/client/index.tsx` (modify — screen, request-response)

**Analog:** `src/app/trainer/exercises/index.tsx` (lines 1-107) — multi-state screen pattern

**Loading + error + data pattern** (exercises/index.tsx lines 72-106):
```typescript
export default function ExercisesScreen() {
  const { data, isLoading } = useExercises();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        {/* Loading */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#00FF66" size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={...}
            ListEmptyComponent={...}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
```

**Phase 3 adaptation:** replace `FlatList` with conditional `HomeStateCard` render, add two query hooks, add hydration gate, add stale-date check:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClientActiveAssignment } from '@/hooks/useClientActiveAssignment';
import { useTodaySession } from '@/hooks/useTodaySession';
import { useSessionStore } from '@/stores/sessionStore';
import { computeTodayWorkout, localTodayString } from '@/lib/workoutDayComputer';
import { HomeStateCards } from '@/components/workout/HomeStateCards';

export default function ClientHomeScreen() {
  const { data: assignment, isLoading: assignmentLoading } = useClientActiveAssignment();
  const { data: todaySession, isLoading: sessionLoading } = useTodaySession();
  const clearSession = useSessionStore((s) => s.clearSession);
  const sessionDate = useSessionStore((s) => s.date);
  const today = localTodayString();

  // Stale-date clear (D-14 / Pitfall 4)
  React.useEffect(() => {
    if (sessionDate !== null && sessionDate !== today) clearSession();
  }, []);

  if (assignmentLoading || sessionLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00FF66" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Derive state + render HomeStateCards
  ...
}
```

---

### `src/app/client/workout/_layout.tsx` (config)

**Analog:** `src/app/trainer/exercises/_layout.tsx` (lines 1-5) — exact copy, rename function

```typescript
import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Note: The celebration screen uses `presentation: 'modal'` — declared on the individual `Stack.Screen` inside `session.tsx` (via `router.push` options), NOT in the layout `screenOptions`. This is the expo-router v5 pattern for per-screen modal presentation.

---

### `src/app/client/workout/session.tsx` (screen, event-driven)

**Analog:** `src/app/trainer/exercises/index.tsx` (lines 1-107) — list screen with state + FlatList

**SafeAreaView + FlatList structure** (exercises/index.tsx lines 40-105):
```typescript
<SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
  <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
    {/* Fixed header */}
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, ... }}>
      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>...</Text>
    </View>

    {/* Scrollable list */}
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ExerciseRow ... />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
    />
  </View>
</SafeAreaView>
```

**Resume prompt** — uses React Native `Alert.alert` (same as `withSaveFeedback` in mutationFeedback.ts line 13 pattern):
```typescript
Alert.alert(
  'Resume workout?',
  'You have an unfinished workout. Resume where you left off?',
  [
    { text: 'Start over', style: 'destructive', onPress: handleStartOver },
    { text: 'Resume', style: 'default', onPress: handleResume },
  ]
);
```

**Finish mutation with feedback** (mirror `withSaveFeedback` from `src/lib/mutationFeedback.ts` lines 1-25):
```typescript
import { withSaveFeedback } from '@/lib/mutationFeedback';

const finishMutation = useFinishSession();

const handleFinish = () => {
  withSaveFeedback(
    () => finishMutation.mutateAsync(sessionData),
    () => {
      sessionStore.clearSession();
      router.push('/client/workout/celebration');
    },
    'Could not save session',
  );
};
```

**Navigation guard** — intercept hardware/gesture back using expo-router's `useNavigation` or a `Pressable` back button with `Alert.alert`.

---

### `src/app/client/workout/celebration.tsx` (screen, request-response)

**Analog:** `src/app/trainer/exercises/index.tsx` — SafeAreaView + centered layout structure

**SafeAreaView centered layout** (exercises/index.tsx lines 40-43):
```typescript
<SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
  <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
    ...centered content...
  </View>
</SafeAreaView>
```

**queryClient invalidation on dismiss** (mirror useCreateExercise.ts invalidate pattern):
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { localTodayString } from '@/lib/workoutDayComputer';

const queryClient = useQueryClient();
const uid = useAuthStore((s) => s.uid);
const today = localTodayString();

const handleBackToHome = () => {
  queryClient.invalidateQueries({ queryKey: ['todaySession', uid, today] });
  router.dismissAll();
};
```

---

### `src/components/workout/ExerciseRow.tsx` (component, event-driven)

**Primary analog:** `src/components/routines/RoutineExerciseRow.tsx` (lines 1-171) — exercise row with internal fields

**Container card pattern** (RoutineExerciseRow.tsx lines 42-50):
```typescript
<View
  style={{
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  }}
>
```

**Header row with Pressable + hitSlop** (RoutineExerciseRow.tsx lines 52-68):
```typescript
<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
  <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
    {exerciseName}
  </Text>
  <Pressable
    onPress={onRemove}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    accessibilityLabel="Remove exercise"
  >
    ...
  </Pressable>
</View>
```

**Secondary analog for list-item structure:** `src/components/exercises/ExerciseListItem.tsx` (lines 19-43) — Pressable card with NativeWind className:
```typescript
<Pressable
  onPress={onPress}
  className="bg-[#1A1A1A] border border-[#444444] rounded-lg p-4 mb-2"
  accessibilityRole="button"
>
  <View className="flex-row items-center justify-between">
    <View className="flex-1 mr-3">
      <Text className="text-white text-base font-semibold" numberOfLines={1}>{exercise.name}</Text>
      <Text className="text-[#888888] text-xs mt-0.5" numberOfLines={1}>{subtitle}</Text>
    </View>
    <Text className="text-[#444444] text-lg">{'›'}</Text>
  </View>
</Pressable>
```

**Expand animation** — use `Animated.View entering={FadeIn.duration(200)}` from `react-native-reanimated`. The `Collapsible` component in the codebase already uses this pattern (referenced in UI-SPEC.md `src/components/ui/collapsible.tsx`).

**Props interface** (mirror RoutineExerciseRow.tsx lines 21-29):
```typescript
export interface ExerciseRowProps {
  exercise: AssignmentSnapshotExercise;
  modeTag: 'gym_only' | 'home_only' | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  readOnly?: boolean;
}
```

---

### `src/components/workout/GymHomeToggle.tsx` (component, event-driven)

**Closest analog:** `src/components/exercises/ExerciseListItem.tsx` — Pressable + NativeWind className pattern

No exact toggle analog exists in the codebase (no existing segmented control). Copy Pressable + NativeWind pattern from ExerciseListItem, build the two-segment layout:

```typescript
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface GymHomeToggleProps {
  mode: 'gym' | 'home';
  onChange: (mode: 'gym' | 'home') => void;
  disabled?: boolean;
}

export function GymHomeToggle({ mode, onChange, disabled }: GymHomeToggleProps) {
  const segments: Array<'gym' | 'home'> = ['gym', 'home'];
  return (
    <View className="flex-row bg-[#1A1A1A] rounded-lg border border-[#444444]">
      {segments.map((seg) => {
        const isActive = mode === seg;
        return (
          <Pressable
            key={seg}
            onPress={() => !disabled && onChange(seg)}
            className={[
              'px-4 py-2 rounded-lg',
              isActive ? 'bg-[#00FF66]' : 'bg-transparent',
            ].join(' ')}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={seg === 'gym' ? 'Gym mode' : 'Home mode'}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text
              className={[
                'text-sm',
                isActive ? 'text-[#0E0E0E] font-semibold' : 'text-[#888888]',
              ].join(' ')}
            >
              {seg.charAt(0).toUpperCase() + seg.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

---

### `src/components/workout/FinishButton.tsx` (component, event-driven)

**Analog:** `src/components/ui/PrimaryButton.tsx` (lines 1-52) — wraps PrimaryButton, adds confirm logic

**PrimaryButton solid pattern** (PrimaryButton.tsx lines 26-52):
```typescript
export function PrimaryButton({ label, onPress, loading = false, disabled = false, variant = 'solid' }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      className={[
        'rounded-lg py-4 items-center justify-center border',
        variant === 'outline' ? 'bg-transparent border-[#444444]' : 'bg-[#00FF66] border-[#00FF66]',
        isDisabled ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? <ActivityIndicator color="#0E0E0E" /> : <Text className="text-[#0E0E0E] font-semibold text-base">{label}</Text>}
    </Pressable>
  );
}
```

**FinishButton** — thin wrapper over PrimaryButton with confirm-alert logic:
```typescript
import { Alert } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export interface FinishButtonProps {
  completedCount: number;
  totalExercises: number;
  isPending: boolean;
  onFinish: () => void;
}

export function FinishButton({ completedCount, totalExercises, isPending, onFinish }: FinishButtonProps) {
  const handlePress = () => {
    if (completedCount === totalExercises) {
      onFinish();
    } else {
      Alert.alert(
        'Finish workout?',
        `You've completed ${completedCount} of ${totalExercises} exercises. Save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish', style: 'default', onPress: onFinish },
        ]
      );
    }
  };
  return (
    <PrimaryButton
      label="Finish Workout"
      onPress={handlePress}
      loading={isPending}
      disabled={isPending}
    />
  );
}
```

---

### `src/components/workout/HomeStateCards.tsx` (component, request-response)

**Analog:** `src/components/exercises/ExerciseListItem.tsx` (lines 19-43) — card component with NativeWind

**Card container pattern** (ExerciseListItem.tsx lines 25-28):
```typescript
<Pressable
  onPress={onPress}
  className="bg-[#1A1A1A] border border-[#444444] rounded-lg p-4 mb-2"
  accessibilityRole="button"
>
```

**HomeStateCards** — no-Pressable `View` cards for non-interactive states, `PrimaryButton` for CTAs. Follow the six-state discriminated union from UI-SPEC.md Screen 1:

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// Each state variant exported as a named component OR a single discriminated-union component.
// Implementation choice at executor discretion — the card bg/border/radius/padding is identical
// across all variants; only icon, heading, body, and optional CTA differ.

// Base card style (copy from ExerciseListItem, drop the Pressable):
// bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6
```

---

## Unit Test Pattern Assignments

### `src/lib/__tests__/workoutDayComputer.test.ts`
### `src/lib/__tests__/variantResolver.test.ts`
### `src/services/__tests__/session.service.test.ts`
### `src/stores/__tests__/sessionStore.test.ts`

**Analog:** `src/services/__tests__/exercise.service.test.ts` (lines 1-271) — the definitive test pattern

**Mock-first structure** (exercise.service.test.ts lines 24-56):
```typescript
// 1. jest.mock() BEFORE all imports (hoisted; avoid TDZ with factory-internal fn creation)
jest.mock('@react-native-firebase/firestore', () => {
  const _mockGet = jest.fn();
  const _mockAdd = jest.fn();
  const _mockWhere = jest.fn(() => ({ get: _mockGet }));
  const _mockCollection = jest.fn(() => ({ where: _mockWhere, add: _mockAdd }));
  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));
  (firestoreFn as any).__mocks = { get: _mockGet, add: _mockAdd, where: _mockWhere, collection: _mockCollection };
  return firestoreFn;
});

// 2. imports AFTER mocks
import { findMyActiveAssignment } from '../session.service';

// 3. retrieve mocks via jest.requireMock()
const firestoreMock = jest.requireMock('@react-native-firebase/firestore');
const mocks = (firestoreMock as any).__mocks;
```

**beforeEach re-wire** (exercise.service.test.ts lines 96-102):
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mocks.collection.mockReturnValue({ where: mocks.where, add: mocks.add });
  mocks.where.mockReturnValue({ get: mocks.get });
});
```

**exists() method mock** (exercise.service.test.ts line 168):
```typescript
mocks.get.mockResolvedValueOnce({ exists: () => true, id: 'doc-id', data: () => docData });
//                               ^^^ exists is a function, not a boolean — RNFB v24
```

**querySnap.empty mock** (for session + assignment duplicate-guard tests):
```typescript
mocks.get.mockResolvedValueOnce({ empty: false, docs: [{ id: 'session-1', data: () => sessionData }] });
mocks.get.mockResolvedValueOnce({ empty: true, docs: [] });
```

**Pure function tests** (analog: `src/validation/__tests__/exercise.filter.test.ts` — no mocks needed):
```typescript
// workoutDayComputer.test.ts — no Firebase mock needed; pure functions only
import { computeTodayWorkout, parseDateOnly, localTodayString } from '../workoutDayComputer';

describe('parseDateOnly — UTC drift prevention', () => {
  it('returns local midnight, not UTC midnight, for YYYY-MM-DD input', () => {
    const d = parseDateOnly('2025-06-03');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // June = 5
    expect(d.getDate()).toBe(3);  // local date, not UTC
  });
});
```

**Store tests** (analog: `src/stores/__tests__/authStore.test.ts` lines 44-52):
```typescript
// Reset store between tests
beforeEach(() => {
  useSessionStore.setState(INITIAL);
});

// For persist middleware tests: mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
```

---

## Shared Patterns

### SafeAreaView
**Source:** `src/app/trainer/exercises/index.tsx` line 40, `src/app/client/_layout.tsx`
**Apply to:** All new screen files (`client/index.tsx`, `workout/session.tsx`, `workout/celebration.tsx`)
```typescript
import { SafeAreaView } from 'react-native-safe-area-context'; // NOT from 'react-native'
// Usage:
<SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
```

### ActivityIndicator loading state
**Source:** `src/app/trainer/exercises/index.tsx` lines 73-77
**Apply to:** `client/index.tsx`, `workout/session.tsx` while queries are pending
```typescript
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
  <ActivityIndicator color="#00FF66" size="large" />
</View>
```

### stripUndefinedDeep before Firestore writes
**Source:** `src/lib/firestoreWrite.ts` line 20; used in `src/services/exercise.service.ts` line 72
**Apply to:** `createSession()` in `session.service.ts`
```typescript
const ref = await sessionsCollection().add(stripUndefinedDeep(data));
```

### withSaveFeedback for mutation error surfacing
**Source:** `src/lib/mutationFeedback.ts` lines 11-25
**Apply to:** `workout/session.tsx` finish handler
```typescript
import { withSaveFeedback } from '@/lib/mutationFeedback';
withSaveFeedback(() => mutation.mutateAsync(data), onSuccess, 'Could not save session');
```

### RNFB v24 existence checks
**Source:** `src/services/exercise.service.ts` line 51, `src/services/client.service.ts` line 52
**Apply to:** All `getExercise`-style single-doc reads in `session.service.ts`
```typescript
if (!snap.exists()) return null; // method call, not property — RNFB v24
// For collection queries:
if (snap.empty) return null;     // property, no call — RNFB v24
```

### Obsidian Performance color tokens
**Source:** `src/components/exercises/ExerciseListItem.tsx`, `src/components/ui/PrimaryButton.tsx`, `src/app/trainer/exercises/index.tsx`
**Apply to:** All new components and screens
```
bg: #0E0E0E | surface: #1A1A1A | border: #444444 | accent: #00FF66
text: #FFFFFF | muted: #888888 | warning: #FFD600 | destructive: #EF4444
```

### authStore uid selector
**Source:** `src/stores/authStore.ts` lines 43-63; `src/hooks/useExercises.ts` line 18
**Apply to:** All new hooks (`useClientActiveAssignment`, `useTodaySession`, `useFinishSession`)
```typescript
const uid = useAuthStore((s) => s.uid);
// enabled: !!uid (guard against null before first auth event)
```

### NativeWind className styling (where used)
**Source:** `src/components/exercises/ExerciseListItem.tsx` lines 25-41, `src/components/ui/PrimaryButton.tsx` lines 32-39
**Apply to:** All new components — prefer NativeWind `className` over inline `style` objects; use inline `style` only when dynamic values are needed (e.g., `safeAreaInsets.bottom`)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/workout/GymHomeToggle.tsx` | component | event-driven | No segmented-control / toggle component exists in codebase. Closest is Pressable pattern from ExerciseListItem. Build from scratch using existing primitives. |

---

## Metadata

**Analog search scope:** `src/services/`, `src/hooks/`, `src/stores/`, `src/components/`, `src/app/`, `src/lib/`, `src/firebase/`
**Files scanned:** 18 source files + 2 test files read directly; additional files found via Glob/Bash
**Pattern extraction date:** 2026-06-03
