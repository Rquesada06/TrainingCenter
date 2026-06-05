# Requirements: LauFit — Milestone v1.1 (Performance Tracking & Timers)

**Defined:** 2026-06-05
**Core Value:** The trainer can create a program and assign it to a client in under 3 minutes — and now sees real training progress with zero extra steps.

> v1.0 (Phases 1–4) shipped and is Validated in PROJECT.md; archived as `REQUIREMENTS-v1.0.md`. This document scopes **v1.1 only**.
> Decisions locked in discussion: weight = lifting loads (not bodyweight); training-performance focus (no nutrition/body-comp); volume trend is **overall + per-exercise** (no push/pull/legs re-tag); timers are **foreground-only** (keep-awake, no background notification); **RPE kept** per set.

## v1.1 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase (continues numbering from Phase 4 → Phase 5+).

### Logging — per-set workout tracking

- [ ] **LOG-01**: Client logs actual weight, reps, and RPE for each set of an exercise
- [ ] **LOG-02**: Client marks each individual set complete (not just the whole exercise)
- [ ] **LOG-03**: Each set prefills from the trainer's target / the client's previous session so an unchanged set is one tap
- [ ] **LOG-04**: Per-set logs persist crash-safe mid-session and write once on finalize (additive `Session.loggedExercises`, back-compatible)

### Prescription — trainer set + timer config

- [ ] **PRES-01**: Trainer sets per-exercise targets — sets count, rep range, and target RPE — in the routine builder
- [ ] **PRES-02**: Trainer sets a rest period (seconds) per exercise
- [ ] **PRES-03**: Trainer sets a work/duration (seconds) for timed exercises

### Timers

- [ ] **TIMR-01**: Client starts a rest-timer countdown from the trainer's configured rest period after completing a set
- [ ] **TIMR-02**: Client starts a work/duration-timer countdown from the trainer's configured duration for timed exercises
- [ ] **TIMR-03**: A running timer shows remaining time, keeps the screen awake, and resolves correctly from an absolute end-time when briefly backgrounded
- [ ] **TIMR-04**: Timer completion fires an alarm sound + vibration

### Insights — client training progress

- [ ] **INST-01**: Client sees an Insights view with auto-detected Personal Records per lift (best estimated 1RM + heaviest weight; "NEW" badge on a fresh PR)
- [ ] **INST-02**: Client sees an overall + per-exercise volume trend chart (total volume Σ weight×reps over time)

### Coach Visibility

- [ ] **COAV-01**: Trainer sees a client's logged per-set loads (weight/reps/RPE) inside the existing session-detail screen
- [ ] **COAV-02**: Trainer can view a client's Personal Records + volume trend (per-client Insights)

## v2 Requirements

Acknowledged, deferred — not in this roadmap.

### Insights+

- **INST-03**: Push/pull/legs movement-pattern grouping for strength trends (requires tagging the exercise library)
- **INST-04**: Bodyweight + body-fat tracking with goal ring (body-composition)
- **INST-05**: Export progress data (CSV/PDF)

### Timers+

- **TIMR-05**: Background alarm via scheduled local notification when the app is backgrounded/locked
- **TIMR-06**: kg/lb unit toggle for logged weights

### Wearables

- **WEAR-01**: Steps / resting heart-rate / sleep / kcal cards via Apple Health / Google Fit

## Out of Scope

Explicitly excluded for v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Bodyweight / body-fat tracking | Body-composition reads as nutrition, not training performance (user steer) → v2 INST-04 |
| Steps / HR / sleep / kcal cards | Require Apple Health / Google Fit wearables integration → v2 WEAR-01 |
| Push/pull/legs trend grouping | Needs a movement-pattern tag not in the current taxonomy → v2 INST-03 |
| Background timer alarm | Foreground keep-awake covers the in-gym case; background needs notifications + permissions → v2 TIMR-05 |
| kg/lb unit toggle | Standardize on kg for v1.1 → v2 TIMR-06 |
| Nutrition tracking | Out of product scope |
| Data export | Not core to the progress loop → v2 INST-05 |
| Per-set trainer prescription | Trainer prescribes at exercise level; per-set targets add builder complexity without clear value |

## Traceability

Which phase covers which requirement. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOG-01 | TBD | Pending |
| LOG-02 | TBD | Pending |
| LOG-03 | TBD | Pending |
| LOG-04 | TBD | Pending |
| PRES-01 | TBD | Pending |
| PRES-02 | TBD | Pending |
| PRES-03 | TBD | Pending |
| TIMR-01 | TBD | Pending |
| TIMR-02 | TBD | Pending |
| TIMR-03 | TBD | Pending |
| TIMR-04 | TBD | Pending |
| INST-01 | TBD | Pending |
| INST-02 | TBD | Pending |
| COAV-01 | TBD | Pending |
| COAV-02 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-06-05*
*Last updated: 2026-06-05 after milestone v1.1 discussion + research*
