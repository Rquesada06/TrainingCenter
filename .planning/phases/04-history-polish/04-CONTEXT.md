# Phase 4: History + Polish - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The closing MVP phase. Both roles can review **session history** (paginated); the
trainer's client list shows **adherence** at a glance; both roles have real
**editable profiles with photos** (Firebase Storage + cached loading); and every
list that can be empty shows a **purposeful empty state**.

In scope: HIST-01..04, PROF-01..03, and success-criterion 5 (empty states across
all lists). Out of scope (post-MVP): push notifications, in-app messaging,
trainer-editing-a-client's-photo, analytics dashboards.
</domain>

<decisions>
## Implementation Decisions

### Adherence (HIST-04)
- **D-01:** Adherence = **completed sessions ÷ scheduled workout days elapsed**.
  The denominator is the count of **non-rest days the program scheduled from
  `startDate` up to `min(today, program end)`** — i.e. workouts that were *due so
  far* (a pure function over the assignment snapshot + startDate, reusing the
  Phase 3 date-only math). NOT total program days, NOT calendar days.
- **D-02:** A **partial** session counts toward the numerator — "showing up
  counts." Any saved session for a scheduled day = completed for adherence.
- **D-03:** Adherence is computed over the **current active program only** (resets
  when a new program is assigned). Shown as a % on each trainer client-list card.

### Session history (HIST-01/02/03)
- **D-04:** The history list is **all-time, newest-first, paginated** — every
  completed session across all the client's programs (date, routine name, status).
  The **same component** serves the client viewing their own history and the
  trainer viewing a specific client's history (from the client profile screen).
- **D-05:** Each row shows a **status badge**: green **"Completed"** when
  `completedExerciseIds.length === totalExercises`, else yellow **"Partial X/Y"**
  (derived — there is no `status` field on the session record).
- **D-06:** Tapping a session opens a **detail view** showing **which exercises
  were completed** (HIST-02). The session stores `completedExerciseIds` +
  `routineName` but not exercise names — resolve names from the assignment
  snapshot for that `weekIndex/dayIndex` (or store names at finish; planner decides).

### Profiles + photos (PROF-01/02/03)
- **D-07:** Each user edits **only their own** name + photo (client edits own,
  trainer edits own). Reuse the existing owner-update Firestore path.
- **D-08:** Photo source = **camera + photo library** (the user chooses) via
  **`expo-image-picker`** — a NEW native module → requires one dev-client rebuild.
- **D-09:** **Square-crop in the picker + downscale to ~512px** before upload
  (small, consistent circular avatars; cheap Storage/bandwidth).
- **D-10:** Store the photo in **Firebase Storage** (`@react-native-firebase/storage`,
  already a dependency) at a per-user path (e.g. `users/{uid}/profile.jpg`); save
  the resulting download URL to the user doc's `photoURL`; display via the existing
  **`ClientPhoto`** (expo-image, cached). Storage security rules must allow a user
  to write only their own path.

### Empty states (success criterion 5)
- **D-11:** A **single reusable `EmptyState` component** (icon + title + short
  message) applied to every list that can be empty: exercises, routines, programs,
  clients, sessions/history.
- **D-12:** Lists the user can act on get an **action CTA** ("+ Add exercise",
  "+ Add client", "+ New routine/program"); purely-derived lists (a client's
  session history, the sessions list) get **message only**.

### Claude's Discretion
- Pagination mechanism + page size (e.g. ~20, infinite-scroll vs "Load more") —
  use the existing `sessions (clientId, date DESC)` composite index.
- Exact empty-state copy + icons per screen; exact adherence rounding/format
  (e.g. "82%").
- Whether session detail re-derives exercise names from the snapshot or the finish
  flow denormalises them into the session record.
- Storage upload path naming + whether to delete the old photo on replace.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 4: History + Polish" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` — HIST-01..04, PROF-01..03

### Data the phase reads/writes
- `src/types/session.ts` — `Session` (date, weekIndex, dayIndex, mode,
  `completedExerciseIds[]`, `totalExercises`, startedAt, completedAt, routineName).
  Status is **derived**, not stored.
- `src/types/assignment.ts` — the snapshot (week×day, exercise names) for adherence
  denominator + session-detail exercise names; `Assignment.startDate`, `status`.
- `src/types/user.ts` — `User.photoURL` (already present).
- `src/lib/workoutDayComputer.ts` — date-only math + day-type logic to reuse for
  "scheduled workout days elapsed".

### Backend already in place
- `firestore.rules` — sessions read (client own / trainer's client), users owner-update
  (allows non-privileged fields incl. photoURL). **NEW:** Firebase **Storage rules**
  must be added (user writes only `users/{uid}/*`).
- `firestore.indexes.json` — `sessions (clientId ASC, date DESC)` exists (history/adherence queries).

### Conventions
- `CLAUDE.md` — stack/versions. Memory: RNFB v24 `snap.exists()` is a method;
  Firestore writes use `stripUndefinedDeep`; safe-area via `react-native-safe-area-context`.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/clients/ClientPhoto.tsx` — photo-or-initial avatar (expo-image, cached) → reuse for profile photos everywhere.
- `src/services/*` + `src/hooks/*` — service + TanStack Query v5 hook pattern; `useClients`/`useActiveAssignment` analogs for the new session-history + adherence hooks.
- `src/app/trainer/clients/[clientId].tsx` (client profile — add history link + the trainer's view of the client's sessions), `src/app/trainer/clients/index.tsx` (`ClientListItem` — add adherence %), `src/app/client/profile.tsx` + `src/app/trainer/profile.tsx` (add name + photo edit), `src/app/client/index.tsx`/history list.
- `src/lib/firestoreWrite.ts` `stripUndefinedDeep`, `src/lib/mutationFeedback.ts` `withSaveFeedback`, `src/components/ui/PrimaryButton`, `TextField`.

### Established Patterns
- Reads via `useQuery`; writes via `useMutation` + `withSaveFeedback`; `snap.exists()` / `querySnap.empty` (RNFB v24). Obsidian Performance dark theme; tab routes hidden from tab bars via `href: null` when they're pushed stacks.

### Integration Points
- **New:** session-history service + paginated hook (query `sessions where clientId==X orderBy date desc`); adherence pure function (snapshot + startDate + sessions → %); `EmptyState` component; profile-edit screens; `expo-image-picker` flow; Firebase Storage upload service + `storage.rules`.
- **Modify:** `ClientListItem` (adherence), client/trainer profile screens (name+photo edit), client profile screen (trainer's history view), every list screen (EmptyState).
</code_context>

<specifics>
## Specific Ideas

- Adherence must be **"keeping up" honest**: completed (incl. partials) ÷ workouts
  due so far on the current program — not diluted by future days or rest days.
- History is one all-time list reused for both roles (client = own, trainer = a client's).
- Profiles finally make the avatars real (Storage + caching) — small square photos.
- Empty states are the difference between "looks broken" and "looks intentional" —
  one component, CTA where the user can act.
</specifics>

<deferred>
## Deferred Ideas

- Push notifications / workout reminders — post-MVP.
- In-app trainer↔client messaging — post-MVP.
- Trainer editing a client's photo/profile — out of scope (each edits own).
- Analytics/charts beyond the single adherence % — post-MVP.

Discussion stayed within HIST-01..04 / PROF-01..03 + empty states.
</deferred>

---

*Phase: 04-history-polish*
*Context gathered: 2026-06-04*
