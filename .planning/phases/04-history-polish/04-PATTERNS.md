# Phase 4: History + Polish - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 18 new/modified files
**Analogs found:** 14 / 18 (4 have no close analog — see "No Analog Found" section)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/session.service.ts` (ADD functions) | service | CRUD + paginated-read | `src/services/session.service.ts` (existing) / `src/services/exercise.service.ts` | exact (extend existing) |
| `src/services/storage.service.ts` (NEW) | service | file-I/O | `src/services/client.service.ts` (structure only) | no-analog (new infra) |
| `src/lib/adherence.ts` (NEW) | utility/pure-fn | transform | `src/lib/workoutDayComputer.ts` | exact |
| `src/hooks/useSessionHistory.ts` (NEW) | hook | paginated/infinite | `src/hooks/useExercises.ts` (useQuery shape) | partial (different query type — see no-analog) |
| `src/hooks/useUpdateProfile.ts` (NEW) | hook | CRUD/mutation | `src/hooks/useUpdateClient.ts` | exact |
| `src/components/ui/EmptyState.tsx` (NEW) | component | request-response | `src/components/ui/PrimaryButton.tsx` | role-match |
| `src/components/sessions/StatusBadge.tsx` (NEW) | component | transform | `src/components/clients/ClientListItem.tsx` (NoProgramIndicator) | role-match |
| `src/components/sessions/SessionListItem.tsx` (NEW) | component | request-response | `src/components/clients/ClientListItem.tsx` | exact |
| `src/components/clients/AdherenceBadge.tsx` (NEW) | component | transform | `src/components/clients/ClientListItem.tsx` (NoProgramIndicator) | role-match |
| `src/components/clients/ClientListItem.tsx` (MODIFY) | component | request-response | `src/components/clients/ClientListItem.tsx` (self) | self |
| `src/app/client/history.tsx` (NEW) | screen | paginated | `src/app/trainer/clients/index.tsx` | role-match |
| `src/app/client/history/[sessionId].tsx` (NEW) | screen | request-response | `src/app/trainer/clients/[clientId].tsx` | role-match |
| `src/app/client/profile.tsx` (UPGRADE) | screen | CRUD + file-I/O | `src/app/trainer/clients/[clientId].tsx` | exact (name+photo edit pattern) |
| `src/app/trainer/profile.tsx` (UPGRADE) | screen | CRUD + file-I/O | `src/app/trainer/clients/[clientId].tsx` | exact (name+photo edit pattern) |
| `src/app/trainer/clients/index.tsx` (MODIFY) | screen | CRUD | `src/app/trainer/clients/index.tsx` (self) | self |
| `src/app/trainer/clients/[clientId].tsx` (MODIFY) | screen | paginated | `src/app/trainer/clients/[clientId].tsx` (self) | self |
| `storage.rules` (NEW) | config | — | `firestore.rules` (structural analog only) | no-analog (new Firebase service) |
| `firebase.json` (MODIFY) | config | — | `firebase.json` (self) | self |
| `src/lib/__tests__/adherence.test.ts` (NEW) | test | — | `src/lib/__tests__/workoutDayComputer.test.ts` | exact |
| `src/services/__tests__/session.service.test.ts` (NEW) | test | — | `src/services/__tests__/client.service.test.ts` | exact |
| `src/services/__tests__/storage.service.test.ts` (NEW) | test | — | `src/services/__tests__/client.service.test.ts` | role-match |

---

## Pattern Assignments

### `src/services/session.service.ts` (extend existing — add `fetchSessionPage` + `fetchSessionsForAdherence`)

**Analog:** `src/services/session.service.ts` (lines 1–83) — extend, do not replace

**Imports pattern** (lines 21–24 of existing file):
```typescript
import { assignmentsCollection, sessionsCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';
```
Add to imports:
```typescript
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
```

**Core paginated-read pattern** — model on `findTodaySession` (lines 53–68) extended with cursor:
```typescript
// session.service.ts existing pattern (lines 55–67):
export async function findTodaySession(
  clientId: string,
  todayStr: string
): Promise<Session | null> {
  const snap = await sessionsCollection()
    .where('clientId', '==', clientId)
    .where('date', '==', todayStr)
    .limit(1)
    .get();

  if (snap.empty) return null;   // RNFB v24: .empty is a PROPERTY, not a method
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Session;
}
```

New `fetchSessionPage` adds `.orderBy` + `.startAfter` cursor + `SESSION_PAGE_SIZE`:
```typescript
export const SESSION_PAGE_SIZE = 20;

export interface SessionPage {
  items: Session[];
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

  if (cursor) q = q.startAfter(cursor);

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Session));
  const lastDoc =
    items.length === SESSION_PAGE_SIZE
      ? (snap.docs[snap.docs.length - 1] as FirebaseFirestoreTypes.QueryDocumentSnapshot<Session>)
      : undefined;
  return { items, lastDoc };
}
```

**Adherence sessions batch-read** — model on `findMyActiveAssignment` (lines 38–49):
```typescript
// For adherence: fetch ALL sessions for a given assignmentId (small N, MVP)
export async function fetchSessionsForAssignment(
  clientId: string,
  assignmentId: string
): Promise<Session[]> {
  const snap = await sessionsCollection()
    .where('clientId', '==', clientId)
    .where('assignmentId', '==', assignmentId)
    .get();

  if (snap.empty) return [];    // RNFB v24: .empty is a PROPERTY
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Session));
}
```

**RNFB v24 asymmetry rule** (already in file):
- `QuerySnapshot.empty` — property (no parentheses): `if (snap.empty) return null;`
- `DocumentSnapshot.exists()` — method (with parentheses): `if (!snap.exists()) return null;`

---

### `src/services/storage.service.ts` (NEW)

**Analog:** `src/services/client.service.ts` (service module structure) — no Firebase Storage analog exists yet.

**Module structure** to copy from `client.service.ts` (lines 1–24):
```typescript
/**
 * Storage service — Phase 04 (PROF-01/02/03)
 *
 * Pure async functions for Firebase Storage upload + Firestore photoURL write.
 * No React, no hooks — UI layer consumes via useMutation in useUpdateProfile.
 *
 * Security: storage.rules enforces request.auth.uid == userId path check.
 *   Client cannot upload to another user's path.
 */
```

**Core upload pattern** (from RESEARCH.md Pattern 3):
```typescript
import storage from '@react-native-firebase/storage';
import { usersCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';

export async function uploadProfilePhoto(uid: string, fileUri: string): Promise<string> {
  const ref = storage().ref(`users/${uid}/profile.jpg`);
  await ref.putFile(fileUri);         // fileUri is file:// URI from expo-image-picker
  return await ref.getDownloadURL();
}

export async function updateUserProfile(
  uid: string,
  partial: { photoURL?: string; name?: string }
): Promise<void> {
  await usersCollection()
    .doc(uid)
    .update(stripUndefinedDeep(partial));  // stripUndefinedDeep pattern from exercise.service.ts line 72
}
```

**stripUndefinedDeep usage** — model on `exercise.service.ts` (lines 70–79):
```typescript
// exercise.service.ts createExercise (lines 70–79):
const ref = await exercisesCollection().add({
  ...stripUndefinedDeep(input),
  trainerId,
  createdAt: firestore.FieldValue.serverTimestamp(),
});
```

---

### `src/lib/adherence.ts` (NEW pure function)

**Analog:** `src/lib/workoutDayComputer.ts` (lines 1–134) — exact structural match

**File header pattern** (copy from `workoutDayComputer.ts` lines 1–11):
```typescript
/**
 * adherence — Phase 04 (HIST-04)
 *
 * Pure function for computing adherence % over the current active program.
 * No React, no Firebase — consumed by ClientListItem via useQuery.
 *
 * Reuses parseDateOnly, localTodayString, dayOffset from workoutDayComputer.ts
 * to avoid UTC-midnight off-by-one errors (same critical comment applies).
 */
```

**Imports pattern** (model on `workoutDayComputer.ts` lines 13–14):
```typescript
import { parseDateOnly, localTodayString, dayOffset } from './workoutDayComputer';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';
```

**Core pure function pattern** from RESEARCH.md — key constructs to copy:
- `parseDateOnly` for program end date calculation (avoid `toISOString()` UTC trap)
- `dayOffset(startDate, capStr)` as loop upper bound
- `snapshot.weeks[weekIndex]?.days[dayIndex]` optional-chaining (same as `workoutDayComputer.ts` line 125)
- Return `null` for denominator=0 (same null-guard pattern as `computeTodayWorkout` line 112: `if (offset < 0) return ...`)

```typescript
export function computeAdherence(
  assignment: Assignment,
  sessions: Session[],
  todayStr: string = localTodayString()
): number | null {
  const { startDate, snapshot } = assignment;
  if (todayStr < startDate) return null;   // program hasn't started

  // Build programEndDate string — use parseDateOnly to stay in local time
  const startMs = parseDateOnly(startDate).getTime();
  const endMs = startMs + (snapshot.durationWeeks * 7 - 1) * 86_400_000;
  const endDate = new Date(endMs);
  const endDateStr = [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, '0'),
    String(endDate.getDate()).padStart(2, '0'),
  ].join('-');

  // Cap: min(today, programEnd) — ISO string comparison is correct for YYYY-MM-DD
  const capStr = todayStr < endDateStr ? todayStr : endDateStr;
  const capOffset = dayOffset(startDate, capStr);

  let denominator = 0;
  for (let offset = 0; offset <= capOffset; offset++) {  // inclusive — see RESEARCH.md off-by-one guard
    const weekIndex = Math.floor(offset / 7);
    const dayIndex = offset % 7;
    const day = snapshot.weeks[weekIndex]?.days[dayIndex]; // same optional chaining as workoutDayComputer line 125
    if (day?.type === 'routine') denominator++;
  }

  if (denominator === 0) return null;
  const numerator = sessions.filter((s) => s.assignmentId === assignment.id).length;
  return Math.round((numerator / denominator) * 100);
}
```

---

### `src/hooks/useSessionHistory.ts` (NEW — useInfiniteQuery, NO existing analog)

**Closest structural analog:** `src/hooks/useExercises.ts` (lines 1–25) — same import style, same `enabled: !!uid` guard, same `staleTime` pattern. But the query type is different: `useInfiniteQuery` instead of `useQuery`.

**useQuery shape to copy** from `useExercises.ts` (lines 13–25):
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

**New pattern for useInfiniteQuery** (no codebase analog — use RESEARCH.md Pattern 1):
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';   // different import — useInfiniteQuery not useQuery
import { fetchSessionPage } from '@/services/session.service';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Session } from '@/types/session';

export function useSessionHistory(clientId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['sessionHistory', clientId],
    queryFn: ({ pageParam }) => fetchSessionPage(clientId!, pageParam),
    initialPageParam: undefined as
      | FirebaseFirestoreTypes.QueryDocumentSnapshot<Session>
      | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < SESSION_PAGE_SIZE ? undefined : lastPage.lastDoc,
    enabled: !!clientId,
    staleTime: 60_000,   // 1 min — history is append-only; avoid list churn on refocus
    gcTime: 5 * 60_000,  // 5 min — keep pages in cache while navigating away
  });
}
// In UI: const sessions = data?.pages.flatMap((p) => p.items) ?? [];
```

**FlatList integration pattern** — `onEndReached` guard to prevent double-fetch:
```typescript
onEndReached={() => {
  if (!isFetchingNextPage && hasNextPage) fetchNextPage();
}}
onEndReachedThreshold={0.3}
```

---

### `src/hooks/useUpdateProfile.ts` (NEW)

**Analog:** `src/hooks/useUpdateClient.ts` (lines 1–31) — exact match

**Pattern to copy** (lines 15–31):
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { updateClientProfile } from '@/services/client.service';

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const trainerId = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: ({ uid, partial }: { uid: string; partial: { name?: string } }) =>
      updateClientProfile(uid, partial),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', trainerId] });
      queryClient.invalidateQueries({ queryKey: ['client', uid] });
    },
  });
}
```

**Adapted for profile update** — `mutationFn` calls `updateUserProfile` from `storage.service.ts`; invalidate `['user', uid]` query key:
```typescript
import { updateUserProfile } from '@/services/storage.service';
// mutationFn: ({ uid, partial }) => updateUserProfile(uid, partial)
// onSuccess: invalidate ['user', uid] so ClientPhoto re-renders with new photoURL
```

---

### `src/components/ui/EmptyState.tsx` (NEW)

**Analog:** `src/components/ui/PrimaryButton.tsx` (lines 1–52) — same role (pure presentational UI component), same Obsidian Performance token usage

**Import pattern** (lines 16–17):
```typescript
import React from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
```

For EmptyState:
```typescript
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
```

**Design token pattern** from `PrimaryButton.tsx` (lines 44–51) — dark background, green accent CTA:
```typescript
// PrimaryButton solid variant (line 37): bg-[#00FF66] with text #0E0E0E
// EmptyState CTA reuses PrimaryButton (not a custom Pressable) per UI-SPEC.md
```

**Props interface pattern** from `PrimaryButton.tsx` (lines 18–24):
```typescript
export interface PrimaryButtonProps extends Pick<PressableProps, 'onPress'> {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
}
```

**EmptyState props** (UI-SPEC.md § EmptyState):
```typescript
interface EmptyStateProps {
  icon: React.ReactNode;    // caller provides Ionicons element; wrap with accessibilityElementsHidden
  title: string;
  message: string;
  ctaLabel?: string;        // omit for read-only lists (D-12)
  onCta?: () => void;
}
```

**Obsidian Performance colors to apply:**
- Container: `paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center'`
- Title: `fontSize: 20, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginBottom: 8`
- Message: `fontSize: 14, fontWeight: '400', color: '#888888', textAlign: 'center', lineHeight: 21`
- CTA: `<PrimaryButton label={ctaLabel} onPress={onCta} />` with `marginTop: 24`

---

### `src/components/sessions/StatusBadge.tsx` (NEW)

**Analog:** `src/components/clients/ClientListItem.tsx` NoProgramIndicator sub-component (lines 29–44)

**Pattern to copy** (NoProgramIndicator, lines 29–44):
```typescript
function NoProgramIndicator() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD600', marginRight: 5 }} />
      <Text style={{ color: '#FFD600', fontSize: 12 }}>No active program</Text>
    </View>
  );
}
```

**StatusBadge differs** — pill shape with tinted background; two variants:
```typescript
// Completed variant: bg=rgba(0,255,102,0.12), text color=#00FF66
// Partial variant:   bg=rgba(255,214,0,0.12), text color=#FFD600
// Both: borderRadius=4, paddingHorizontal=8, paddingVertical=4, fontSize=14, fontWeight='600'
```

**Derivation logic** (D-05 — status is NEVER stored on Session):
```typescript
interface StatusBadgeProps { session: Session; }
// isComplete = session.completedExerciseIds.length === session.totalExercises
// label = isComplete ? 'Completed' : `Partial ${session.completedExerciseIds.length}/${session.totalExercises}`
// accessibilityLabel = isComplete ? 'Status: Completed' : `Status: Partial, ${n} of ${total} exercises`
```

---

### `src/components/sessions/SessionListItem.tsx` (NEW)

**Analog:** `src/components/clients/ClientListItem.tsx` (lines 50–103) — exact structural match

**Props interface pattern** (lines 50–53):
```typescript
export interface ClientListItemProps {
  client: User;
  onPress: () => void;
}
```
Adapted:
```typescript
export interface SessionListItemProps {
  session: Session;
  onPress: () => void;
}
```

**Pressable row layout pattern** (lines 74–102):
```typescript
<Pressable
  onPress={onPress}
  style={{
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#444444',
    padding: 16,                  // SessionListItem: paddingVertical=12, paddingHorizontal=16
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  }}
>
  {/* date + routineName left column (flex: 1) */}
  {/* StatusBadge right-aligned */}
</Pressable>
```

**Date format** (UI-SPEC.md § SessionListItem):
```typescript
// new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
// Always append 'T00:00:00' — prevents UTC midnight shift (same local-time principle as parseDateOnly)
```

**Accessibility** (UI-SPEC.md § Accessibility):
```typescript
accessibilityRole="button"
accessibilityLabel={`${session.routineName ?? 'Session'} on ${formattedDate}, ${statusLabel}`}
```

---

### `src/components/clients/AdherenceBadge.tsx` (NEW)

**Analog:** `src/components/clients/ClientListItem.tsx` NoProgramIndicator (lines 29–44) — same inline-text sub-component pattern within a list row

**Pattern to copy** (lines 29–44 structure):
```typescript
// NoProgramIndicator: View row + dot + Text
// AdherenceBadge: View row + Text only (no dot — threshold color on text)
```

**Color threshold logic** (UI-SPEC.md § AdherenceBadge):
```typescript
interface AdherenceBadgeProps { adherence: number | null; }
// if null → return null (don't render)
// if < 50 → color '#FFD600'
// if 50–79 → color '#FFFFFF'
// if >= 80 → color '#00FF66'
// text: `${adherence}% adherence`
// accessibilityLabel: `Adherence: ${adherence} percent`
```

**Integration into `ClientListItem`** — add below programLabel slot (line 70 area):
```typescript
// After programLabel, add:
{adherence !== null && <AdherenceBadge adherence={adherence} />}
// adherence computed from computeAdherence(assignment, sessions, today) in useMemo or per-item useQuery
```

---

### `src/components/clients/ClientListItem.tsx` (MODIFY — add AdherenceBadge + sessions query)

**Analog:** Self (lines 1–103)

**Existing per-row useQuery pattern** (lines 56–71) to extend:
```typescript
export function ClientListItem({ client, onPress }: ClientListItemProps) {
  const activeAssignment = useActiveAssignment(client.uid);  // existing hook per row
  // Add: const sessionsForAdherence = useQuery for sessions when assignment exists
  // Add: const adherence = useMemo(() => computeAdherence(...), [assignment, sessions])
```

**Loading guard pattern** already in file (lines 60–71):
```typescript
if (activeAssignment.isLoading) {
  programLabel = <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>…</Text>;
} else if (activeAssignment.data) {
  // show label + now also AdherenceBadge
}
```

**Import additions needed:**
```typescript
import { AdherenceBadge } from '@/components/clients/AdherenceBadge';
import { computeAdherence } from '@/lib/adherence';
import { fetchSessionsForAssignment } from '@/services/session.service';
import { useQuery } from '@tanstack/react-query';
import { localTodayString } from '@/lib/workoutDayComputer';
```

---

### `src/app/client/history.tsx` (NEW screen — paginated list)

**Analog:** `src/app/trainer/clients/index.tsx` (lines 1–82) — same list+loading+empty pattern

**SafeAreaView + loading state pattern** (lines 22–50):
```typescript
export default function ClientsScreen() {
  const { data: clients, isLoading } = useClients();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#00FF66" size="large" />
          </View>
        ) : (
          <FlatList ... />
        )}
      </View>
    </SafeAreaView>
  );
}
```

**FlatList with ListEmptyComponent pattern** (lines 52–78):
```typescript
<FlatList<User>
  data={clients ?? []}
  keyExtractor={(item) => item.uid}
  renderItem={({ item }) => <ClientListItem ... />}
  ListEmptyComponent={...}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 24 }}
/>
```

**Adaptations for history screen:**
- Use `useSessionHistory(clientId)` — returns `{ data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage }`
- Flatten pages: `data?.pages.flatMap((p) => p.items) ?? []`
- `ListFooterComponent`: `isFetchingNextPage` → `ActivityIndicator`; `!hasNextPage && sessions.length > 0` → "All sessions loaded"
- `ListEmptyComponent`: `<EmptyState icon={...} title="No sessions yet" message="..." />` (no CTA — D-12)
- `onEndReached={() => { if (!isFetchingNextPage && hasNextPage) fetchNextPage(); }}`
- `onEndReachedThreshold={0.3}`

---

### `src/app/client/history/[sessionId].tsx` (NEW session detail screen)

**Analog:** `src/app/trainer/clients/[clientId].tsx` (lines 1–232) — same push-stack screen pattern: `useLocalSearchParams`, loading state, not-found guard, ScrollView layout, card sections

**Route params pattern** (lines 24–25):
```typescript
const { clientId } = useLocalSearchParams<{ clientId: string }>();
const router = useRouter();
```
Adapted: `const { sessionId } = useLocalSearchParams<{ sessionId: string }>();`

**Loading + not-found guards** (lines 43–62):
```typescript
if (client.isLoading) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00FF66" size="large" />
      </View>
    </SafeAreaView>
  );
}
if (!client.data) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#888888', fontSize: 16 }}>Client not found.</Text>
      </View>
    </SafeAreaView>
  );
}
```

**ScrollView card sections pattern** (lines 83–229):
```typescript
<SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
  <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
    {/* card: bg='#1A1A1A', borderRadius=8, padding=16, marginBottom=16 */}
    <View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}>
        EXERCISES
      </Text>
      {/* exercise rows */}
    </View>
  </ScrollView>
</SafeAreaView>
```

**Exercise name resolution** (Option A — re-derive from snapshot, RESEARCH.md § Pattern 5):
```typescript
const day = assignment?.snapshot.weeks[session.weekIndex]?.days[session.dayIndex];
const allExercises = day?.routine?.exercises ?? [];
const completedSet = new Set(session.completedExerciseIds);
const completedExercises = allExercises.filter((e) => completedSet.has(e.exerciseId));
const skippedExercises = allExercises.filter((e) => !completedSet.has(e.exerciseId));
```

---

### `src/app/client/profile.tsx` (UPGRADE — add name + photo edit)

**Analog:** `src/app/trainer/clients/[clientId].tsx` (lines 1–232) — the edit-name card (lines 126–175) and save/confirmation/error pattern is the direct model

**Existing profile screen pattern to replace** (current `client/profile.tsx` lines 16–54 — minimal, sign-out only). The upgrade adds:

**Edit-name card pattern** from `[clientId].tsx` (lines 126–175):
```typescript
<View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16, marginBottom: 16 }}>
  <Text style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}>
    EDIT PROFILE
  </Text>
  <TextField label="Name" value={nameValue} onChangeText={setNameValue} />
  <PrimaryButton
    label="Save Name"
    onPress={handleSaveName}
    loading={updateClient.isPending}
    disabled={!nameValue.trim() || nameValue.trim() === client.data.name}
  />
  {savedConfirmation && (
    <Text style={{ color: '#00FF66', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
      Saved
    </Text>
  )}
  {updateClient.isError && (
    <Text style={{ color: '#FF4444', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
      {(updateClient.error as Error)?.message ?? 'Failed to save — please try again.'}
    </Text>
  )}
</View>
```

**Sign-out pattern** from existing `client/profile.tsx` (lines 19–30) — copy unchanged:
```typescript
const handleSignOut = () => {
  Alert.alert('Sign out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign out',
      style: 'destructive',
      onPress: () => withSaveFeedback(() => signOut(), () => {}, 'Could not sign out'),
    },
  ]);
};
```

**Photo change interaction** — new pattern (no analog; see RESEARCH.md Pattern 3):
```typescript
// Alert.alert with camera/library choice → ImagePicker → uploadProfilePhoto → updateUserProfile
const handleChangePhoto = async () => {
  Alert.alert('Change photo', '', [
    { text: 'Take photo', onPress: () => pickAndUpload('camera') },
    { text: 'Choose from library', onPress: () => pickAndUpload('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);
};
```

**Avatar Pressable** wrapping `ClientPhoto` — copy `ClientPhoto` usage from `[clientId].tsx` (lines 97–110):
```typescript
<ClientPhoto photoURL={client.data.photoURL} name={client.data.name} size={96} />
```

---

### `src/app/trainer/profile.tsx` (UPGRADE — identical pattern to client/profile.tsx upgrade)

**Analog:** Same as `src/app/client/profile.tsx` upgrade above — current trainer profile (lines 1–55) is identical in structure. The upgrade follows the same pattern. The only difference is the `useUpdateProfile` mutation invalidates `['user', uid]` for the trainer's own user doc.

---

### `src/app/trainer/clients/index.tsx` (MODIFY — replace inline empty text with EmptyState)

**Analog:** Self (lines 1–82)

**Current inline empty state** (lines 61–76) to replace:
```typescript
ListEmptyComponent={
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
    <Text style={{ color: '#888888', fontSize: 15, textAlign: 'center' }}>
      No clients yet — tap Add Client to create one.
    </Text>
  </View>
}
```

**Replace with:**
```typescript
import { EmptyState } from '@/components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

ListEmptyComponent={
  <EmptyState
    icon={<Ionicons name="people-outline" size={40} color="#444444" />}
    title="No clients yet"
    message="Add your first client to get started."
    ctaLabel="+ Add Client"
    onCta={() => router.push('/trainer/clients/add')}
  />
}
```

---

### `src/app/trainer/clients/[clientId].tsx` (MODIFY — replace SESSION HISTORY placeholder with real list)

**Analog:** Self (lines 212–228) — the placeholder card to replace:
```typescript
{/* ── Session history placeholder (Phase 4 — HIST-04) ───────────── */}
<View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16 }}>
  <Text style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}>
    SESSION HISTORY
  </Text>
  <Text style={{ color: '#888888', fontSize: 14, fontStyle: 'italic' }}>
    Session history coming in Phase 4.
  </Text>
</View>
```

**Replace with** the same FlatList pattern as `client/history.tsx` but inline (card-section context):
- Keep the `SESSION HISTORY` label
- Add `useSessionHistory(clientId)` — `clientId` already available from `useLocalSearchParams`
- Render `SessionListItem` rows; `ListEmptyComponent` = `EmptyState` with trainer-view copy (no CTA)
- Tap → push to session detail screen

---

### `storage.rules` (NEW)

**Analog:** `firestore.rules` (structural analog — same Firebase security rules syntax, different service)

**Firestore rules file structure to mirror** (`firestore.rules` lines 1–8):
```
rules_version = '2';
// Source comment
// Rule comment

service cloud.firestore {
  match /databases/{database}/documents {
```

**Storage rules** (RESEARCH.md Code Examples):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**firebase.json modification** — add `storage` entry (self-analog, current lines 1–9):
```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "functions": { "source": "functions" },
  "storage": { "rules": "storage.rules" }
}
```

---

### `src/lib/__tests__/adherence.test.ts` (NEW)

**Analog:** `src/lib/__tests__/workoutDayComputer.test.ts` — exact structural match (pure function tests, no mocks)

**File structure to copy** (lines 1–17):
```typescript
/**
 * Unit tests for adherence — Phase 04 (HIST-04)
 * Pure function tests — no mocks required.
 */

import { computeAdherence } from '../adherence';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';
```

**Fixture pattern** (lines 20–80 of `workoutDayComputer.test.ts`):
```typescript
// makeAssignment helper (lines 56–80) — copy and adapt for adherence tests:
function makeAssignment(startDate: string, durationWeeks: number, dayGrid?: ...): Assignment
// Use same REST_DAY / ROUTINE_DAY fixture pattern
```

**Test cases to cover** (RESEARCH.md § Pattern 2 test case + RESEARCH.md § Pitfall 3):
- Returns `null` before program start
- Returns `null` when denominator is 0 (all rest days elapsed)
- Correct % when program mid-run (cap = today < endDate)
- Correct % when program completed (cap = endDate)
- Off-by-one: `capOffset` includes day 0 (start day)
- Partial sessions count as completed (D-02)

---

### `src/services/__tests__/session.service.test.ts` (NEW)

**Analog:** `src/services/__tests__/client.service.test.ts` (lines 1–250) — exact pattern

**Hoisted jest.mock factory pattern** (lines 20–49):
```typescript
jest.mock('@react-native-firebase/firestore', () => {
  const _mockGet = jest.fn();
  const _mockLimit = jest.fn(() => ({ get: _mockGet }));
  const _mockOrderBy = jest.fn(() => ({ get: _mockGet, limit: _mockLimit }));
  const _mockWhere2 = jest.fn(() => ({ orderBy: _mockOrderBy, limit: _mockLimit, get: _mockGet }));
  const _mockWhere = jest.fn(() => ({ where: _mockWhere2, orderBy: _mockOrderBy, limit: _mockLimit, get: _mockGet }));
  const _mockCollection = jest.fn(() => ({ where: _mockWhere }));

  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));
  (firestoreFn as any).__mocks = { get: _mockGet, limit: _mockLimit, orderBy: _mockOrderBy, where2: _mockWhere2, where: _mockWhere, collection: _mockCollection };
  return firestoreFn;
});
```

**RNFB v24 `exists` as function form** (line 157 of `client.service.test.ts`):
```typescript
// CRITICAL: exists must be a function, not a property, in test mocks:
mocks.get.mockResolvedValueOnce({ exists: () => true, id: 'doc-id', data: () => docData });
mocks.get.mockResolvedValueOnce({ exists: () => false });
```

**`snap.empty` as property** for QuerySnapshot mocks (line 116 pattern):
```typescript
// QuerySnapshot mock: { docs: [...] } — empty is checked as `snap.docs.length === 0` in session.service.ts
// OR mock explicitly: { empty: true, docs: [] } / { empty: false, docs: [...] }
```

**Key tests to cover:**
- `fetchSessionPage`: `where('clientId')` + `orderBy('date','desc')` + `limit(20)` called; cursor-less first page; `.startAfter(cursor)` on subsequent page
- `fetchSessionsForAssignment`: `where('clientId')` + `where('assignmentId')` called
- `findTodaySession` (existing — add regression test if not covered)

---

### `src/services/__tests__/storage.service.test.ts` (NEW)

**Analog:** `src/services/__tests__/client.service.test.ts` (mock factory structure) — adapt for RNFB storage mock

**Storage mock factory** (no existing analog in codebase — new RNFB module to mock):
```typescript
jest.mock('@react-native-firebase/storage', () => {
  const _mockGetDownloadURL = jest.fn();
  const _mockPutFile = jest.fn();
  const _mockRef = jest.fn(() => ({ putFile: _mockPutFile, getDownloadURL: _mockGetDownloadURL }));
  const storageFn = jest.fn(() => ({ ref: _mockRef }));
  (storageFn as any).__mocks = { ref: _mockRef, putFile: _mockPutFile, getDownloadURL: _mockGetDownloadURL };
  return storageFn;
});

// Also mock @react-native-firebase/firestore for updateUserProfile:
jest.mock('@react-native-firebase/firestore', () => { ... }); // same pattern as client.service.test.ts
```

**Key tests to cover:**
- `uploadProfilePhoto`: `storage().ref('users/uid/profile.jpg')` called; `ref.putFile(uri)` called; `ref.getDownloadURL()` called; returns download URL string
- `updateUserProfile`: `usersCollection().doc(uid).update(stripped)` called with `photoURL` and/or `name`; `undefined` values stripped by `stripUndefinedDeep`

---

## Shared Patterns

### Auth / User Identity
**Source:** `src/stores/authStore.ts` (accessed via `useAuthStore((s) => s.uid)`)
**Apply to:** `useSessionHistory.ts`, `useUpdateProfile.ts`, profile screens
```typescript
// From useExercises.ts line 18 / useUpdateClient.ts line 21:
const uid = useAuthStore((s) => s.uid);
// or for trainer context:
const trainerId = useAuthStore((s) => s.uid);
```

### Error Handling — Mutation Alert
**Source:** `src/app/trainer/clients/[clientId].tsx` lines 64–81 + `src/lib/mutationFeedback.ts`
**Apply to:** Profile screens (name save, photo upload), any mutating screen
```typescript
// From [clientId].tsx lines 64–81 — onError in mutate callback:
updateClient.mutate(
  { uid: clientId, partial: { name: nameValue.trim() } },
  {
    onSuccess: () => { setSavedConfirmation(true); setTimeout(() => setSavedConfirmation(false), 2000); },
    onError: (err) => {
      Alert.alert('Could not save name', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    },
  }
);

// For fire-and-forget async (sign out): withSaveFeedback from mutationFeedback.ts
import { withSaveFeedback } from '@/lib/mutationFeedback';
withSaveFeedback(() => signOut(), () => {}, 'Could not sign out');
```

### Firestore Write Safety
**Source:** `src/lib/firestoreWrite.ts` + `src/services/exercise.service.ts` lines 72–79
**Apply to:** `storage.service.ts` `updateUserProfile`, any new `.update()` or `.add()` call
```typescript
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
// Always wrap partial objects: await ref.update(stripUndefinedDeep(partial));
```

### RNFB v24 Snapshot Access
**Source:** `src/services/client.service.ts` line 52 + `src/services/session.service.ts` line 46
**Apply to:** All new service functions
```typescript
// DocumentSnapshot: exists is a METHOD — call with parentheses:
if (!snap.exists()) return null;   // client.service.ts line 52

// QuerySnapshot: empty is a PROPERTY — no parentheses:
if (snap.empty) return null;       // session.service.ts line 46
```

### SafeAreaView Screen Root
**Source:** Every existing screen (`src/app/trainer/clients/index.tsx` line 26)
**Apply to:** All new screens (`client/history.tsx`, session detail, profile upgrades)
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
<SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
```

### FlatList + Loading Pattern
**Source:** `src/app/trainer/clients/index.tsx` lines 46–78
**Apply to:** `client/history.tsx`, trainer `[clientId].tsx` inline session list
```typescript
{isLoading ? (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color="#00FF66" size="large" />
  </View>
) : (
  <FlatList ... />
)}
```

### Card Section Pattern
**Source:** `src/app/trainer/clients/[clientId].tsx` lines 126–175
**Apply to:** Session detail, profile edit screens
```typescript
<View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16, marginBottom: 16 }}>
  <Text style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}>
    SECTION HEADER
  </Text>
  {/* content */}
</View>
```

### Saved Confirmation Text
**Source:** `src/app/trainer/clients/[clientId].tsx` lines 151–160
**Apply to:** Profile edit screens (name save success)
```typescript
{savedConfirmation && (
  <Text style={{ color: '#00FF66', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
    Saved
  </Text>
)}
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/useSessionHistory.ts` | hook | paginated/infinite | `useInfiniteQuery` is a new query type — no existing infinite-scroll hook in codebase. Copy RESEARCH.md Pattern 1 for the `initialPageParam`/`getNextPageParam` shape. Use `useExercises.ts` as structural template (imports, `enabled` guard, `staleTime`) but swap `useQuery` → `useInfiniteQuery`. |
| `src/services/storage.service.ts` | service | file-I/O | Firebase Storage (`putFile` + `getDownloadURL`) is a new infrastructure surface — no Storage service in codebase. Use `client.service.ts` for file/module structure only. Copy upload pattern verbatim from RESEARCH.md Pattern 3. |
| `storage.rules` | config | — | Firebase Storage security rules are a new file type — only `firestore.rules` exists as a structural analog. Use RESEARCH.md Code Example (storage.rules section) verbatim. |
| `src/services/__tests__/storage.service.test.ts` (RNFB storage mock) | test | — | No RNFB Storage mock exists in codebase. Mock shape for `storage().ref().putFile().getDownloadURL()` must be constructed from scratch using the jest.mock hoisted-factory pattern from `client.service.test.ts`. |

---

## Metadata

**Analog search scope:** `src/services/`, `src/hooks/`, `src/lib/`, `src/components/`, `src/app/`, `src/firebase/`, root config files
**Files scanned:** 28
**Pattern extraction date:** 2026-06-04
