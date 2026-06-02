---
phase: 02
slug: trainer-content-creation
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-01
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (react-native project) + ts-jest (firestore-rules project) |
| **Config file** | `jest.config.js` — two projects: `react-native` (src/**) and `firestore-rules` (firestore/**) |
| **Quick run command** | `npx jest --testPathPattern=src --passWithNoTests` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds (unit only) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=src --passWithNoTests`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green + device smoke test on Expo dev client
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| exercise-schema | TBD | W0 | EXER-01 | T-02-06 | rejects invalid category enum and negative numeric fields | unit | `npx jest --testPathPattern=exercise.schema` | ❌ W0 | ⬜ pending |
| exercise-filter | TBD | W0 | EXER-04, EXER-05 | — | client-side filter scoped to trainer's list | unit | `npx jest --testPathPattern=exercise.filter` | ❌ W0 | ⬜ pending |
| routine-schema | TBD | W0 | ROUT-01 | — | rejects exercises array with min(1) | unit | `npx jest --testPathPattern=routine.schema` | ❌ W0 | ⬜ pending |
| program-schema | TBD | W0 | PROG-01 | — | rejects durationWeeks < 1 | unit | `npx jest --testPathPattern=program.schema` | ❌ W0 | ⬜ pending |
| assignment-service | TBD | W0 | ASGN-02 | T-02-03 | detects active assignment before overwrite | unit | `npx jest --testPathPattern=assignment.service` | ❌ W0 | ⬜ pending |
| firestore-rules-phase2 | TBD | W0 | EXER-06 | T-02-01 | trainer cannot read another trainer's exercise | integration | `firebase emulators:exec --only firestore "npx jest --testPathPattern=rules"` | ❌ W0 (extend existing) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/validation/__tests__/exercise.schema.test.ts` — schema validation for EXER-01 (required name, enum category, locationTypes, positive numerics)
- [ ] `src/validation/__tests__/exercise.filter.test.ts` — client-side filter function for EXER-04, EXER-05 (search by name, filter by category/locationType)
- [ ] `src/validation/__tests__/routine.schema.test.ts` — schema validation for ROUT-01 (exercises array min 1)
- [ ] `src/validation/__tests__/program.schema.test.ts` — schema validation for PROG-01 (name required, durationWeeks >= 1)
- [ ] `src/firebase/__tests__/assignment.service.test.ts` — ASGN-02 overwrite warning query
- [ ] `firestore/__tests__/rules.test.ts` — extend existing file with Phase 2 rules (exercises cross-trainer denial, routines cross-trainer denial, programs cross-trainer denial, assignments read restriction)

*Wave 0 stubs must exist before Wave 1 execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| createAssignment Cloud Function creates snapshot and returns assignmentId | ASGN-03 | Requires Firebase Emulator (auth + firestore + functions) | Run `firebase emulators:exec --only auth,firestore,functions "npx jest --testPathPattern=createAssignment"` |
| expo-image renders with null photoURL (shows placeholder initials) | CLNT-02 | UI rendering test — no automated component test infrastructure | Visual check on device: client without photo should show placeholder |
| Drag-and-drop exercise reorder in routine builder works on device | ROUT-04 | Animation behavior requires physical device / simulator | Long-press exercise row, drag to new position, verify onDragEnd updates order |
| Program builder grid (7-column Week×Day) renders correctly on small screens | PROG-02 | Layout test requires device | Verify week grid renders without overflow on 375px wide device |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
