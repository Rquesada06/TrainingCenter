# Roadmap: LauFit

## Overview

LauFit ships as four vertical slices, each delivering a complete working capability. Phase 1 establishes the Firebase backbone and auth shell so both roles can log in with correct navigation. Phase 2 gives the trainer the full content-creation and client-management toolchain, culminating in assigning an immutable snapshot of a program to a client. Phase 3 puts that assignment to work on the client side — calculating today's workout, executing the session, and persisting state across crashes. Phase 4 closes the loop with history, profiles, and the polish that makes the product trustworthy for real daily use.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure + Auth** - Firebase setup, EAS dev build, auth flow, role-based navigation shell, Cloud Function, composite indexes (completed 2026-05-28)
- [~] **Phase 2: Trainer Content Creation** - Exercise library, routine builder, program builder, client management, program assignment with snapshot transaction, trainer dashboard *(planned — 5 plans, 4 waves)*
- [x] **Phase 3: Client Workout Execution** - Workout calculator, four home states, session execution, gym/home toggle, crash-safe local state, completion flow, duplicate guard (completed 2026-06-04)
- [ ] **Phase 4: History + Polish** - Paginated session history, trainer client history view, profiles with photos, empty states, adherence metrics, in-session navigation guard

## Phase Details

### Phase 1: Infrastructure + Auth

**Goal**: Both roles can open the app on a real device, authenticate, and land on the correct role-protected navigation shell — with no auth flash on cold start and with the security rules, database indexes, and Cloud Function that all subsequent phases depend on.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, CLNT-01
**Success Criteria** (what must be TRUE):

  1. Trainer can log in with email/password on a real device and remain logged in after closing and reopening the app
  2. Client can log in with credentials the trainer created and land on the client navigation shell
  3. App shows a splash screen (not a flash of the login screen) on cold start until Firebase fires the first auth event
  4. Trainer can trigger a password reset email from the login screen
  5. Trainer can create a new client account via the createClientAccount Cloud Function and that client can immediately log in

**Plans**: 4 plans (3 waves)Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Project scaffold, dependency install, EAS + Firebase + NativeWind config, shared user types (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Zustand authStore, Firebase auth listener, SplashScreen + Stack.Protected root layout, role shells (Wave 2)
- [x] 01-04-PLAN.md — createClientAccount Cloud Function (v1 onCall), Firestore security rules, composite indexes (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Sign-in screen (RHF + zod), password reset, Obsidian Performance UI (Wave 3)

### Phase 2: Trainer Content Creation

**Goal**: The trainer can build an exercise library, compose routines from those exercises, assemble multi-week programs from those routines, and assign a complete program snapshot to a client — the full content pipeline that makes client workout delivery possible.
**Depends on**: Phase 1
**Requirements**: EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05, ROUT-06, ROUT-07, PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, PROG-06, ASGN-01, ASGN-02, ASGN-03, ASGN-04, CLNT-02, CLNT-03, CLNT-04, CLNT-05
**Success Criteria** (what must be TRUE):

  1. Trainer can create, edit, search, and filter exercises in their personal library — exercises are not visible to other trainers
  2. Trainer can build a routine by picking exercises, overriding sets/reps/duration/rest/notes per exercise, setting gym-or-home alternatives, and reordering exercises via drag and drop
  3. Trainer can create a multi-week program, assign routines to specific days, mark rest days, and edit or delete the program
  4. Trainer can assign a program to a client with a start date — the system stores a full immutable snapshot so editing the original program does not affect the active assignment — and warns before overwriting an existing active program
  5. Trainer dashboard shows each client's name, photo, active program, and a visual indicator when no program is assigned

**Plans**: 5 plans (4 waves)
**UI hint**: yes

**Wave 1**

- [x] 02-01-PLAN.md — Types, Zod v4 schemas, Wave 0 test stubs, Firestore service refs, 4 new composite indexes (exercises/routines/programs/users), 5-tab trainer nav shell, package install checkpoint (Wave 1)

**Wave 2** *(blocked on Wave 1 completion — parallel: exercises and clients touch disjoint file trees)*

- [x] 02-02-PLAN.md — Exercise library: service + hooks + ExerciseForm + list/new/edit screens with search and filter (EXER-01..06) (Wave 2)
- [x] 02-03-PLAN.md — Client management: client.service + ClientPhoto + list/profile/add screens + useActiveAssignment hook for CLNT-05 indicator (CLNT-02..05) (Wave 2)

**Wave 3** *(blocked on Wave 1+2 — routines reference exercises)*

- [x] 02-04-PLAN.md — Routine builder: service + hooks + RoutineBuilder with @gorhom/bottom-sheet picker + react-native-reanimated-dnd drag-reorder + alternatives + device verify checkpoint (ROUT-01..07) (Wave 3)

**Wave 4** *(blocked on Wave 3 — programs reference routines; assignment needs both clients and programs)*

- [x] 02-05-PLAN.md — Programs + Assignment: program CRUD + Week×Day grid + DayPickerSheet + createAssignment v1 onCall Cloud Function + AssignProgramModal with ASGN-02 overwrite warning + end-to-end smoke test checkpoint (PROG-01..06, ASGN-01..04) (Wave 4)

### Phase 3: Client Workout Execution

**Goal**: The client opens the app and immediately sees today's workout (or the correct empty state), can execute the full session with gym/home toggling, and the session is saved reliably to Firestore on completion — with crash-safe local state throughout.
**Depends on**: Phase 2
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07, WORK-08, WORK-09
**Success Criteria** (what must be TRUE):

  1. Client's home screen always shows one of four correct states on open: no program, program starts in N days, rest day with motivational message, or today's active workout — no additional navigation required
  2. Client can view exercise detail (name, description, sets x reps or duration, rest period, trainer notes, embedded video or image) and mark each exercise complete
  3. Client can toggle gym/home mode at session level — exercises with alternatives switch variant and the choice persists for the session
  4. Tapping "Finish Workout" saves a complete session record to Firestore and shows a celebration/summary screen; if the app crashed mid-session the client is offered to resume on next open
  5. App prevents creating a duplicate session if the client already completed today's workout

**Plans**: 5 plans (4 waves)
**UI hint**: yes

**Wave 1**

- [x] 03-01-PLAN.md — Foundation: Session type, sessionsCollection ref, workoutDayComputer (date-only math + 6-state machine, WORK-01) + variantResolver (gym/home swap, WORK-05) + Wave 0 unit tests (Wave 1)

**Wave 2** *(blocked on Wave 1 — needs Session type + sessionsCollection + localTodayString)*

- [x] 03-02-PLAN.md — Data layer: session.service (client-scoped read + duplicate guard + finish write), sessionStore (Zustand+persist+AsyncStorage), 3 query/mutation hooks, last-mode helper, expo-video install checkpoint + Wave 0 tests (WORK-06..09) (Wave 2)

**Wave 3** *(blocked on Wave 1+2 — screens consume the pure functions, hooks, and store; Plans 03 & 04 touch disjoint files → parallel)*

- [x] 03-03-PLAN.md — Client Home: HomeStateCards (six states) + stateful index.tsx wiring computeTodayWorkout + hooks + stale-date clear (WORK-01, WORK-02) (Wave 3)
- [x] 03-04-PLAN.md — Workout execution: GymHomeToggle + ExerciseRow (inline video/image) + FinishButton + session screen (resume/finish/read-only) + celebration screen (WORK-03..08) (Wave 3)

**Wave 4** *(blocked on Wave 3 — end-to-end UAT needs the full feature + native rebuild)*

- [x] 03-05-PLAN.md — On-device UAT: full jest+tsc gate, native dev-client rebuild for expo-video, manual end-to-end verification of all six states, video, toggle, crash-resume, finish, duplicate guard (WORK-01..09) (Wave 4)

### Phase 4: History + Polish

**Goal**: Both roles can review session history, clients and trainers have real profiles with photos, every screen handles empty states gracefully, the trainer's client list shows adherence at a glance, and no rough edges remain that would prevent daily use by a real trainer and client.
**Depends on**: Phase 3
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):

  1. Client can view a paginated list of completed sessions (date, routine name, status) and tap any session to see which exercises were completed
  2. Trainer can view a specific client's session history from the client profile screen, paginated in the same way
  3. Trainer's client list card shows each client's adherence percentage (sessions completed / sessions programmed)
  4. Client and trainer can view and edit their profile name and photo, with photos stored in Firebase Storage and loaded with caching
  5. All screens that can be empty (no exercises, no routines, no programs, no clients, no sessions) show a purposeful empty state rather than a blank screen

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure + Auth | 4/4 | Complete   | 2026-05-28 |
| 2. Trainer Content Creation | 5/5 | Complete    | 2026-06-03 |
| 3. Client Workout Execution | 5/5 | Complete    | 2026-06-04 |
| 4. History + Polish | 0/TBD | Not started | - |
