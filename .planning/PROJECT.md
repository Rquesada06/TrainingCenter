# LauFit

## What This Is

LauFit is a mobile fitness coaching app that connects personal trainers with their clients. The trainer programs workouts; the client executes them. It starts with one real trainer (Lau) as the first customer, architected to scale to any trainer. Two roles, no friction.

## Core Value

The trainer can create a program and assign it to a client in under 3 minutes — if that flow is fast and reliable, trainers will adopt the tool.

## Current Milestone: v1.1 Performance Tracking & Timers

**Goal:** Turn passive "mark complete" workouts into logged, measurable training — clients record actual loads per set and run trainer-set timers, and both sides see real training progress (PRs, strength trends).

**Target features:**
- Per-set workout logging — client enters actual weight + reps + RPE per set and checks each off
- Trainer set-prescription + timer config — sets × rep-range × target RPE, plus rest-seconds and work-duration per exercise
- Rest + work timers — client-started countdowns from the trainer's values, with alarm sound + vibration on completion
- Training Insights (client) — new Insights tab: auto-detected Personal Records + strength/volume trend bars
- Coach visibility — logged per-set loads surfaced in the existing session-detail; per-client PRs/trends via the same Insights view

## Requirements

### Validated

<!-- Shipped and confirmed valuable in v1.0 (Phases 1–4), device-verified. -->

- ✓ Trainer can log in with email/password and stay logged in — v1.0
- ✓ Trainer can create and manage client accounts — v1.0
- ✓ Trainer can build a reusable exercise library (name, type, sets/reps, video URL) — v1.0
- ✓ Trainer can create daily routines by selecting exercises from their library — v1.0
- ✓ Trainer can create multi-week programs by assigning routines to days — v1.0
- ✓ Trainer can mark days as rest days in a program — v1.0
- ✓ Trainer can assign a program to a client with a start date (immutable snapshot) — v1.0
- ✓ Trainer dashboard shows active clients and their current programs + adherence — v1.0
- ✓ Client can log in and see today's workout (auto-calculated from assignment + start date) — v1.0
- ✓ Client can view exercise detail (instructions, YouTube video, sets/reps) — v1.0
- ✓ Client can toggle between gym/home variants when available — v1.0
- ✓ Client can mark exercises as complete and finalize the session (crash-safe, duplicate-guarded) — v1.0
- ✓ Client and trainer can view paginated session history — v1.0
- ✓ Client and trainer have a profile with name + photo — v1.0

### Active

<!-- v1.1 scope. Building toward these. -->

- [ ] Client logs actual weight + reps + RPE per set, checking each set off
- [ ] Trainer prescribes set targets (sets × rep-range × RPE) and timer values (rest-seconds, work-duration) per exercise
- [ ] Client runs a rest timer between sets from the trainer's configured rest period
- [ ] Client runs a work/duration timer for timed exercises from the trainer's configured duration
- [ ] Timer signals completion with an alarm sound + vibration
- [ ] Client sees an Insights view with auto-detected Personal Records per lift
- [ ] Client sees strength/volume trend bars derived from logged sessions
- [ ] Trainer sees a client's logged per-set loads in the existing session detail
- [ ] Trainer can view a client's Personal Records + strength trends

### Out of Scope

- Bodyweight / body-fat tracking — body-composition reads as nutrition, not training performance (this milestone is training-focused)
- Steps / heart-rate / sleep / kcal cards — require Apple Health / Google Fit (wearables deferred)
- Nutrition tracking — out of scope
- Data export (CSV/PDF from Insights) — deferred; not core to the progress loop
- Chat/messaging — adds complexity, not core to workout delivery
- In-app payments — post-MVP monetization
- Custom video upload — uses YouTube/Vimeo links instead
- Multi-language — English only

## Context

- **Requirements document:** `LauFit — Diseño MVP_ Aplicación Móvil de (1).ini` — full user stories, data model, API list, and 4-phase roadmap defined
- **Design system:** StitchUI mockups in `stitch_coach_lab_training_platform/` — 9 screens with HTML/PNG, using **Obsidian Performance** theme (electric green `#00FF66`, tech-noir minimalism, Hanken Grotesk + JetBrains Mono, dark `#0E0E0E` base)
- **First user:** Built for a real trainer (Lau) — validates fast, scales to multi-trainer later
- **Firestore data model:** USERS, EXERCISES, ROUTINES, PROGRAMS, ASSIGNMENTS, SESSIONS collections fully defined in requirements doc

## Constraints

- **Tech Stack:** React Native (Expo SDK 51+) + Firebase (Auth, Firestore, Storage, Functions) — decided upfront, non-negotiable for MVP
- **Navigation:** expo-router (file-based routing)
- **State:** react-query for server state, zustand for client state
- **Forms:** react-hook-form + zod
- **UI:** NativeWind (Tailwind for React Native) matching Obsidian Performance design system
- **Timeline:** 8–10 weeks with 1–2 devs
- **Platforms:** iOS + Android via Expo EAS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Program snapshot on assignment | If trainer edits a program, active client assignments are unaffected — avoids edit-while-active data corruption | — Pending |
| Gym/home via `alternativeExerciseId` cross-reference | Simpler than embedded variants; reuses exercise library; easier to query | — Pending |
| Firebase over custom backend | Auth + DB + Storage ready in hours; real-time listeners perfect for trainer→client sync; scales without ops | — Pending |
| Obsidian Performance design theme | Cleaner, more modern than Elite Bio-Performance — electric green accent used sparingly, 8px grid | — Pending |
| exercises embedded in ROUTINES | Always read together; 20–30 exercise limit per routine makes embedded array safe | ✓ Good |
| v1.1 is training-performance, not body-composition | User steer: "useful for training and progress more than a nutrition app" — log lifting loads + PRs/trends, defer bodyweight/wearables | — Pending |
| Per-set actuals logged client-side; trainer prescribes at exercise level | Avoids per-set prescription complexity in the builder; client records weight/reps/RPE per set against a sets×rep-range×RPE target | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-05 after starting milestone v1.1 (Performance Tracking & Timers); v1.0 shipped Phases 1–4*
