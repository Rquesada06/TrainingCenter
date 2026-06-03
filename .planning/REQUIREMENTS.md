# Requirements: LauFit

**Defined:** 2026-05-27
**Core Value:** The trainer can create a program and assign it to a client in under 3 minutes — if that flow is fast and reliable, trainers will adopt the tool.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Trainer can log in with email and password
- [x] **AUTH-02**: Client can log in with email and password
- [x] **AUTH-03**: Both roles stay logged in across app restarts (persistent session)
- [x] **AUTH-04**: User can request password reset via email link
- [x] **AUTH-05**: App shows appropriate screen on cold start without flashing login (auth race condition guard)

### Client Management (Trainer)

- [x] **CLNT-01**: Trainer can create a client account (name, email, temporary password) — via Cloud Function (Admin SDK)
- [x] **CLNT-02**: Trainer can view a list of their clients showing name, photo, active program, and adherence percentage
- [x] **CLNT-03**: Trainer can tap a client to view their profile: active program, start date, and session history
- [x] **CLNT-04**: Trainer can edit a client's name and photo
- [x] **CLNT-05**: Client list shows a visual indicator when a client has no active program

### Exercise Library (Trainer)

- [x] **EXER-01**: Trainer can create an exercise with: name, description, category (strength/cardio/functional/hypertrophy/HIIT/mobility), location type (gym/home/both), default sets, default reps, default duration (seconds), default rest (seconds), video URL (YouTube/Vimeo), image URL
- [x] **EXER-02**: Trainer can edit any exercise in their library
- [x] **EXER-03**: Trainer can delete an exercise from their library
- [x] **EXER-04**: Trainer can search exercises by name with instant results (no submit required)
- [x] **EXER-05**: Trainer can filter exercises by location type (gym/home/both) and by category
- [x] **EXER-06**: Exercises belong to the trainer who created them and are not visible to other trainers

### Routine Builder (Trainer)

- [x] **ROUT-01**: Trainer can create a named routine by selecting exercises from their library
- [x] **ROUT-02**: Trainer can override default sets/reps/duration/rest per exercise within a routine
- [x] **ROUT-03**: Trainer can add notes to an exercise within a routine
- [x] **ROUT-04**: Trainer can reorder exercises in a routine via drag and drop
- [x] **ROUT-05**: Trainer can define a gym/home alternative for an exercise within a routine (alternativeExerciseId cross-reference)
- [x] **ROUT-06**: Trainer can edit and delete routines
- [x] **ROUT-07**: Trainer can view a list of all their routines

### Program Builder (Trainer)

- [x] **PROG-01**: Trainer can create a program with: name, description, duration in weeks
- [x] **PROG-02**: Trainer can assign a routine to each day of a program (Lun–Dom × N weeks, or Day 1–N)
- [x] **PROG-03**: Trainer can mark specific days as rest days
- [x] **PROG-04**: Days with no assigned routine default to rest
- [x] **PROG-05**: Trainer can edit and delete programs
- [x] **PROG-06**: Trainer can view a list of all their programs

### Program Assignment (Trainer)

- [x] **ASGN-01**: Trainer can assign a program to a client with a start date
- [x] **ASGN-02**: When assigning, if the client already has an active program, trainer sees a warning before overwriting
- [x] **ASGN-03**: On assignment, the full program (with all routine and exercise data) is copied as an immutable snapshot — editing the original program does not affect active clients
- [x] **ASGN-04**: The system calculates the client's current workout day from start date and client's local timezone using date-only string comparison (not Timestamp arithmetic)

### Client Workout Execution

- [x] **WORK-01**: Client's home screen shows today's workout on open — no additional navigation required
- [x] **WORK-02**: Home screen has four explicit states: (1) no program assigned, (2) program starts in N days, (3) rest day with motivational message, (4) active workout with exercise list
- [x] **WORK-03**: Client can view exercise detail: name, description, sets × reps / duration, rest, trainer notes, embedded video or image
- [x] **WORK-04**: Client can mark each exercise as completed with a checkbox
- [x] **WORK-05**: Client can toggle gym/home mode at the session level — exercises with alternatives switch their variant; toggle choice persists for the session
- [x] **WORK-06**: Client can tap "Finish Workout" when all exercises are marked complete (or manually bypass)
- [x] **WORK-07**: Completing a session shows a celebration/summary screen and saves the session to Firestore
- [x] **WORK-08**: In-progress session state is saved locally (AsyncStorage) so a crash or app close does not lose progress; app offers to resume on next open
- [x] **WORK-09**: App prevents creating a duplicate session if client already completed today's workout

### Session History

- [ ] **HIST-01**: Client can view a paginated list of their completed sessions (date, routine name, status: completed/partial)
- [ ] **HIST-02**: Client can tap a session to see which exercises were completed
- [ ] **HIST-03**: Trainer can view a paginated list of a specific client's sessions (from the client profile screen)
- [ ] **HIST-04**: Trainer's client list card shows adherence percentage (sessions completed / sessions programmed)

### Profile

- [ ] **PROF-01**: Client can view and edit their name and profile photo
- [ ] **PROF-02**: Trainer can view and edit their own name and profile photo
- [ ] **PROF-03**: Profile photos stored in Firebase Storage; loaded with caching (expo-image)

---

## v2 Requirements

### Workout Enhancement

- **WORK-V2-01**: Client can log actual weight and reps per set during workout execution (per-set performance logging)
- **WORK-V2-02**: Rest timer between sets (configurable duration, Reanimated on UI thread)
- **WORK-V2-03**: Client can leave a note on a completed session

### Progress Tracking

- **PROG-V2-01**: Trainer and client can view weight/reps progression charts per exercise over time (requires per-set logging data)
- **PROG-V2-02**: Training streak counter (consecutive days trained)
- **PROG-V2-03**: Workout volume tracking per muscle group

### Trainer Tools

- **TRNR-V2-01**: Trainer can add notes to a client's session after the fact
- **TRNR-V2-02**: Calendar view of a client's program (monthly)
- **TRNR-V2-03**: Trainer can duplicate/template programs across clients

### Notifications

- **NOTF-V2-01**: Push notification to client: "You have a workout today"
- **NOTF-V2-02**: Push notification to trainer when client completes a session

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app chat / messaging | High complexity; not core to workout delivery for MVP |
| Nutrition tracking | Out of MVP scope — separate product problem |
| In-app payments / subscriptions | Post-MVP monetization (Phase 8) |
| Wearables / Apple Health / Google Fit | Phase 8 — too complex for MVP |
| Custom video upload | MVP uses external links (YouTube/Vimeo) to avoid storage costs |
| Multi-language | English only for MVP |
| Advanced analytics | Deferred to Phase 6 (requires per-set data first) |
| Multi-trainer / gym admin | Start with single trainer (Lau), scale to multi-trainer post-MVP |
| Public program marketplace | Post-MVP monetization |
| AI-generated workouts | Out of scope |
| Body measurements / progress photos | Post-MVP |
| Client self-registration | MVP uses trainer-creates-account flow for simplicity |

---

## Traceability

Requirements mapped to phases by roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| CLNT-01 | Phase 1 | Complete |
| CLNT-02 | Phase 2 | Complete |
| CLNT-03 | Phase 2 | Complete |
| CLNT-04 | Phase 2 | Complete |
| CLNT-05 | Phase 2 | Complete |
| EXER-01 | Phase 2 | Complete |
| EXER-02 | Phase 2 | Complete |
| EXER-03 | Phase 2 | Complete |
| EXER-04 | Phase 2 | Complete |
| EXER-05 | Phase 2 | Complete |
| EXER-06 | Phase 2 | Complete |
| ROUT-01 | Phase 2 | Complete |
| ROUT-02 | Phase 2 | Complete |
| ROUT-03 | Phase 2 | Complete |
| ROUT-04 | Phase 2 | Complete |
| ROUT-05 | Phase 2 | Complete |
| ROUT-06 | Phase 2 | Complete |
| ROUT-07 | Phase 2 | Complete |
| PROG-01 | Phase 2 | Complete |
| PROG-02 | Phase 2 | Complete |
| PROG-03 | Phase 2 | Complete |
| PROG-04 | Phase 2 | Complete |
| PROG-05 | Phase 2 | Complete |
| PROG-06 | Phase 2 | Complete |
| ASGN-01 | Phase 2 | Complete |
| ASGN-02 | Phase 2 | Complete |
| ASGN-03 | Phase 2 | Complete |
| ASGN-04 | Phase 2 | Complete |
| WORK-01 | Phase 3 | Complete |
| WORK-02 | Phase 3 | Complete |
| WORK-03 | Phase 3 | Complete |
| WORK-04 | Phase 3 | Complete |
| WORK-05 | Phase 3 | Complete |
| WORK-06 | Phase 3 | Complete |
| WORK-07 | Phase 3 | Complete |
| WORK-08 | Phase 3 | Complete |
| WORK-09 | Phase 3 | Complete |
| HIST-01 | Phase 4 | Pending |
| HIST-02 | Phase 4 | Pending |
| HIST-03 | Phase 4 | Pending |
| HIST-04 | Phase 4 | Pending |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-27*
*Last updated: 2026-05-27 — phase mappings added by roadmapper*
