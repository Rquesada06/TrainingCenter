---
phase: 02-trainer-content-creation
plan: 03
subsystem: clients-tab
tags: [firestore-rules, tanstack-query-v5, expo-image, react-hook-form, zod-v4, clnt-02, clnt-03, clnt-04, clnt-05]

# Dependency graph
requires:
  - phase: 02-trainer-content-creation
    plan: 01
    provides: User types, Assignment types, usersCollection/assignmentsCollection refs, trainer tab shell with clients placeholder
  - phase: 01-infrastructure-auth
    provides: createClientAccount Cloud Function (deployed), firestore.rules baseline, authStore, PrimaryButton, TextField
provides:
  - src/services/client.service.ts (listClients, getClient, updateClientProfile, findActiveAssignmentForClient)
  - src/hooks/useClients.ts, useClient.ts, useUpdateClient.ts, useActiveAssignment.ts
  - src/components/clients/ClientPhoto.tsx, ClientListItem.tsx
  - src/app/trainer/clients/index.tsx (CLNT-02, CLNT-05)
  - src/app/trainer/clients/[clientId].tsx (CLNT-03, CLNT-04)
  - src/app/trainer/clients/add.tsx (createClientAccount CF UI)
  - firestore.rules: trainer-reads-client + trainer-update-non-privileged rules (CLNT-04)
  - findActiveAssignmentForClient re-exported from useActiveAssignment (Plan 02-04 ASGN-02 overwrite check)
affects: [02-04-programs-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN cycle: failing test commit → impl commit (same pattern as 02-02)"
    - "Client service mirrors exercise.service pattern: pure async functions, typed collection refs, no React"
    - "useActiveAssignment re-exports findActiveAssignmentForClient for cross-plan sharing (single source of truth)"
    - "Firestore rules: Firestore diff().affectedKeys().hasAny() to lock role/trainerId/email on trainer-update-client rule"
    - "expo-image Image component with contentFit=cover + transition for avatar rendering"
    - "User type extended with optional photoURL (null for MVP; Phase 4 PROF-02/03 wires upload)"

key-files:
  created:
    - src/services/client.service.ts
    - src/services/__tests__/client.service.test.ts
    - src/hooks/useClients.ts
    - src/hooks/useClient.ts
    - src/hooks/useUpdateClient.ts
    - src/hooks/useActiveAssignment.ts
    - src/components/clients/ClientPhoto.tsx
    - src/components/clients/ClientListItem.tsx
    - src/app/trainer/clients/[clientId].tsx
    - src/app/trainer/clients/add.tsx
    - src/validation/createClient.schema.ts
  modified:
    - src/app/trainer/clients/index.tsx (replaced placeholder with real screen)
    - src/types/user.ts (added optional photoURL field)
    - firestore.rules (added trainer-reads-client + trainer-update-client rules)
    - firestore/__tests__/rules.test.ts (added 7 CLNT-04 test cases)

key-decisions:
  - "photoURL added to User type as optional field — null in MVP; Phase 4 PROF-02/03 will populate it via Firebase Storage upload"
  - "useActiveAssignment re-exports findActiveAssignmentForClient to give Plan 02-04 a single import point for the ASGN-02 overwrite check"
  - "Add client screen uses useQueryClient().invalidateQueries rather than router.replace to land back on the list with fresh data"

# Metrics
duration: ~25min
completed: 2026-06-02
---

# Phase 2 Plan 03: Clients Tab Summary

**Trainer clients tab with list, profile, edit-name (server-enforced), and add-client screens — plus Firestore rules amendments for CLNT-04 trainer-reads/updates-client authorization.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-06-02
- **Tasks:** 3 (Task 1 TDD, Tasks 2-3 auto)
- **Files modified:** 14

## Accomplishments

- **Client service** (`src/services/client.service.ts`): `listClients` (dual WHERE: role + trainerId — T-02-03 defense-in-depth), `getClient`, `updateClientProfile` (name-only), `findActiveAssignmentForClient` (WHERE clientId + status='active' + limit(1))
- **TanStack Query v5 hooks**: `useClients`, `useClient`, `useUpdateClient`, `useActiveAssignment` (+ re-export of service function for Plan 02-04)
- **ClientPhoto**: expo-image with `#1A1A1A`/`#444` circle + `#00FF66` initial placeholder when `photoURL` is null (MVP state)
- **ClientListItem**: per-row `useActiveAssignment` for green program label or yellow `#FFD600` "No active program" badge (CLNT-05)
- **Clients list screen** (`clients/index.tsx`): FlatList with loading spinner, empty-state message, "+ Add Client" header button
- **Client profile screen** (`clients/[clientId].tsx`): 96px avatar, edit-name form with 2s "Saved" confirmation, active-program section with start date, session history placeholder (Phase 4)
- **Add client screen** (`clients/add.tsx`): RHF + Zod v4 form for name/email/temporaryPassword → `createClientAccountCallable` → query invalidation → router.back()
- **firestore.rules**: two new rules in `match /users/{userId}`:
  1. `allow read: if isTrainer() && resource.data.trainerId == request.auth.uid;` (CLNT-03 — trainer reads own client)
  2. `allow update: if isTrainer() && resource.data.trainerId == request.auth.uid && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'trainerId', 'email']);` (CLNT-04 — trainer updates non-privileged fields; role/trainerId/email locked)
- **7 new rules tests** (`describe 'Phase 2 — CLNT-04 trainer reads/updates own client'`): read own, read other-trainer's client (denied), update name (allowed), update role/trainerId/email (all denied), update other-trainer's client (denied)

## Service/Hook Exports

| Export | File | Consumers |
|--------|------|-----------|
| `listClients(trainerId)` | client.service.ts | useClients |
| `getClient(uid)` | client.service.ts | useClient |
| `updateClientProfile(uid, partial)` | client.service.ts | useUpdateClient |
| `findActiveAssignmentForClient(clientId)` | client.service.ts | useActiveAssignment, Plan 02-04 ASGN-02 |
| `useClients()` | useClients.ts | clients/index.tsx |
| `useClient(uid)` | useClient.ts | clients/[clientId].tsx |
| `useUpdateClient()` | useUpdateClient.ts | clients/[clientId].tsx |
| `useActiveAssignment(clientId)` | useActiveAssignment.ts | ClientListItem, clients/[clientId].tsx |
| `findActiveAssignmentForClient` | useActiveAssignment.ts (re-export) | Plan 02-04 |

## Firestore Rules Amendments

Lines added to `match /users/{userId}` block:

1. **Trainer-reads-client rule** (CLNT-02/03):
   ```
   // Trainer can read their own client's user doc — needed for CLNT-02 list, CLNT-03 profile, CLNT-04 edit name.
   allow read: if isTrainer() && resource.data.trainerId == request.auth.uid;
   ```

2. **Trainer-update-client rule** (CLNT-04):
   ```
   // Trainer can update non-privileged fields (name, photoURL) on their own client's doc.
   // Role/trainerId/email remain locked by the role-elevation defense.
   allow update: if isTrainer()
     && resource.data.trainerId == request.auth.uid
     && !request.resource.data.diff(resource.data)
           .affectedKeys()
           .hasAny(['role', 'trainerId', 'email']);
   ```

## Rules Test Cases

**7 new CLNT-04 cases** (total rules test file now: 4 USERS + 4 EXERCISES + 9 cross-trainer + 7 CLNT-04 = 24 cases):
1. trainer can read own client user doc → `assertSucceeds`
2. trainer cannot read other trainer client doc → `assertFails`
3. trainer can update own client name → `assertSucceeds`
4. trainer cannot update own client role → `assertFails`
5. trainer cannot update own client trainerId → `assertFails`
6. trainer cannot update own client email → `assertFails`
7. trainer cannot update other trainer client doc → `assertFails`

## Test Results

- `client.service.test.ts`: **6 tests passing** (GREEN after TDD RED→GREEN cycle)
- Full RN project suite: **43 passed, 1 skipped, 0 failed** (the skipped is assignment.service.test.ts Wave 0 stub)
- `npx tsc --noEmit`: **exits 0**

## Task Commits

1. **Task 1 RED: failing client service tests** - `3a70df7` (test)
2. **Task 1 GREEN: client service + hooks** - `c326af6` (feat)
3. **Task 2: ClientPhoto + ClientListItem** - `f59edd5` (feat)
4. **Task 3: screens + rules + rules tests** - `af1449f` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added `photoURL` to User type**
- **Found during:** Task 2 (ClientPhoto implementation)
- **Issue:** `ClientPhoto` props reference `client.photoURL` but the `User` interface in `src/types/user.ts` did not declare this field, causing TS2339 compile error.
- **Fix:** Added `photoURL?: string | null` to the `User` interface with a doc comment noting Phase 4 PROF-02/03 will wire the upload.
- **Files modified:** `src/types/user.ts`
- **Commit:** f59edd5 (included in Task 2 commit)

## Known Stubs

- **Session history section** in `clients/[clientId].tsx`: `"Session history coming in Phase 4."` — intentional per CLNT-03 spec and Phase 4 HIST-04 mapping. No data source expected yet.
- **`photoURL` field** in `User` type is always `null` in MVP — `createClientAccount` CF does not upload a photo. `ClientPhoto` shows the initial-letter placeholder. Phase 4 PROF-02/03 will wire Firebase Storage upload.

## Threat Flags

None — all threat mitigations from the plan's threat model are implemented:
- T-02-03: `listClients` includes `where('role','==','client')` AND `where('trainerId','==',uid)` + firestore.rules trainer-reads-client rule
- T-02-04: `createClientAccount` CF sets trainerId server-side (Phase 1 mitigation, reused)
- T-02-CLNT-EDIT: `diff().affectedKeys().hasAny(['role','trainerId','email'])` in trainer-update rule; tested by cases 4+5+6
- T-02-CLNT-XACCESS: `resource.data.trainerId == request.auth.uid` check; tested by case 7

## Issues Encountered

- **Firestore rules emulator cannot run in this environment** — `firebase emulators:exec` requires a Java runtime (not installed). Same soft-blocker as Plan 02-01. The 7 new rules test cases are correctly authored and typecheck clean; they follow the identical harness pattern as the existing 17 test cases. **Deferred:** run `firebase emulators:exec --only firestore "npx jest --testPathPattern=firestore/__tests__/rules --passWithNoTests"` on a machine with Java installed to confirm all 24 test cases pass.

## Next Phase Readiness

- Plan 02-04 (programs/assignment) can `import { findActiveAssignmentForClient } from '@/hooks/useActiveAssignment'` for the ASGN-02 overwrite check
- `useActiveAssignment(clientId)` hook is ready for the assignment tab to consume
- Clients tab is fully functional as the trainer dashboard (D-1)
- **Deployment note:** `firebase deploy --only firestore:rules` must be run before manual smoke testing to activate the new trainer-reads-client and trainer-update-client rules

## Self-Check: PASSED

All 12 created/modified files exist on disk. All 4 task commits (3a70df7, c326af6, f59edd5, af1449f) are present in git history.
