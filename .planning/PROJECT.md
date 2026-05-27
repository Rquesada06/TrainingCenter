# LauFit

## What This Is

LauFit is a mobile fitness coaching app that connects personal trainers with their clients. The trainer programs workouts; the client executes them. It starts with one real trainer (Lau) as the first customer, architected to scale to any trainer. Two roles, no friction.

## Core Value

The trainer can create a program and assign it to a client in under 3 minutes — if that flow is fast and reliable, trainers will adopt the tool.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Trainer can log in with email/password and stay logged in
- [ ] Trainer can create and manage client accounts
- [ ] Trainer can build a reusable exercise library (name, type, sets/reps, video URL)
- [ ] Trainer can create daily routines by selecting exercises from their library
- [ ] Trainer can create multi-week programs by assigning routines to days
- [ ] Trainer can mark days as rest days in a program
- [ ] Trainer can assign a program to a client with a start date
- [ ] Trainer dashboard shows active clients and their current programs
- [ ] Client can log in and see today's workout (auto-calculated from assignment + start date)
- [ ] Client can view exercise detail (instructions, video, sets/reps)
- [ ] Client can toggle between gym/home variants when available
- [ ] Client can mark exercises as complete and finalize the session
- [ ] Client and trainer can view session history
- [ ] Client has a basic profile (name, photo)

### Out of Scope

- Chat/messaging — adds complexity, not core to workout delivery
- Nutrition tracking — out of MVP scope
- In-app payments — post-MVP monetization
- Push notifications (advanced) — Phase 2+
- Wearables / Apple Health / Google Fit — Phase 8
- Custom video upload — uses YouTube/Vimeo links instead
- Multi-language — English only for MVP
- Advanced analytics — deferred to Phase 6

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
| exercises embedded in ROUTINES | Always read together; 20–30 exercise limit per routine makes embedded array safe | — Pending |

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
*Last updated: 2026-05-27 after initialization*
