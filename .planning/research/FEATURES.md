# Features Research: LauFit

**Domain:** Personal training app (trainer programs, client executes)
**Researched:** 2026-05-27
**Confidence:** MEDIUM-HIGH — Based on detailed requirements doc (.ini), 9 design mockups, and training knowledge of Trainerize, TrueCoach, PT Distinction, and Mindbody up to August 2025.

---

## Table Stakes

Features users expect from any personal training app. Missing any of these and the app feels incomplete or unprofessional on first use.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Today's workout, visible immediately on login | Clients open the app to find out what they do today — any friction kills daily habit | Low | Already scoped. The "0 taps to workout" requirement is critical. |
| Per-set logging (weight + reps per set) | Every serious training app logs actual performance, not just "did/didn't do" — without this, history is useless | Medium | **Gap in current scope** — mockup (rutina_del_dia) shows weight + reps + RPE per set, but SESSION data model only stores `completed: boolean` per exercise, not per-set actuals. |
| Rest timer | Clients need a countdown between sets — without it they constantly switch apps | Low | Mockup (C05) names this screen "Descanso Timer" — it's scoped as a screen but has no backing timer logic in the data model. |
| Exercise description + visual | Clients must know form before executing — video or image is non-negotiable for safety and trust | Low | Scoped. Video URL (YouTube) or image. |
| Persistent session state | If the client closes the app mid-workout, they must not lose progress | Medium | Explicitly flagged as a risk in the .ini. Must save per-exercise completion to Firestore in real time, not only on "Finish Session." |
| Trainer dashboard showing client status | Trainers managing 5+ clients need a single view — who has a program, who trained today, who is inactive | Low | Scoped. Key stat: adherence percentage (sessions completed / sessions scheduled) mentioned in US-16. |
| Exercise library with search + filter | Trainers rebuild the same exercises constantly — a reusable searchable library is expected in all competitors | Low | Scoped. |
| Program assignment with start date | Core delivery mechanism — how the trainer's plan reaches the client | Low | Scoped. Timezone risk documented. |
| History for both roles | Trainer sees client adherence; client sees their own streak — both need this to trust the tool | Low | Scoped. |
| Empty state handling | "No program assigned" must show a clear message, not a blank screen — clients will be confused otherwise | Low | US-11 specifies a message when no program is assigned; rest day also requires its own screen. |
| Partial session support | Clients sometimes do 70% of a workout — marking a session as "partial" is expected | Low | Scoped in data model (`status: "completed" | "partial"`). Must surface this in the client UI. |

---

## Differentiators

Features that distinguish a great personal training app from a mediocre one. Not table stakes — trainers will adopt the tool without these — but they create retention and word-of-mouth.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-set weight/reps/RPE logging with pre-fill | Clients log what they actually lifted, not just a checkbox. Pre-filling last session's weight reduces friction to near zero | Medium | The mockup already shows this UI (weight input per set, RPE column). The data model needs to grow: `completedExercises` array needs `sets: [{setNumber, actualWeight, actualReps, rpe}]`. This is the single biggest differentiator gap. |
| Adherence percentage on trainer dashboard | "Alex is 85% adherent this month" gives the trainer an instant signal about client engagement. Trainerize and TrueCoach both surface this prominently | Low | US-16 mentions it. Already in scope philosophically; needs to be a first-class metric on T03 (Dashboard) and T06 (Client Profile). |
| Rest day screen with motivational message | Clients who open the app on a rest day and see a blank screen feel ignored. A rest day screen with a message ("Recovery is training") builds app habit | Low | US-11 specifies this. Execution quality matters here — the Obsidian Performance aesthetic fits a motivational rest day treatment well. |
| Celebration screen on session completion | Positive reinforcement on completing a session creates habit loops. Every competitor has some form of this | Low | US-14 specifies "animation/feedback positivo." C06 is the "Completar Sesión / Celebración" screen. Execution quality matters — must not feel cheap. |
| Exercise notes per-session (trainer → client) | The trainer writes "focus on the eccentric" for a specific exercise. The client sees it inline during execution. This is the closest substitute for being in the room with the trainer | Low | Noted in the .ini as P2/post-MVP ("Notas del entrenador por sesión"). However the program builder mockup already shows a notes field per exercise. Promoting this to MVP for the trainer side only (write notes) costs very little — the client reads them in exercise detail. |
| Program phases / periodization labels | Naming program blocks (e.g., "Phase 1: Accumulation, Phase 2: Intensification, Phase 3: Deload") makes programs look professional. The program builder mockup already shows this UI pattern. | Medium | Not in the .ini data model. The `PROGRAMS` collection has no concept of phases within a program. This is a natural post-MVP feature — call it out for Phase 6 roadmap. |
| Superset support | Grouping two exercises that are performed back-to-back is standard in hypertrophy training. The program builder mockup already renders "SUPERSET A" groups | Medium | Not in scope or data model. The current exercises-as-array-in-routines approach cannot represent exercise grouping. Post-MVP only — flagged here because the mockup implies it visually. |
| Weight progress chart per exercise | The client dashboard mockup shows a "Progreso de Peso" chart. Trainers and clients both want to see strength progression over time | Medium | In .ini as Phase 6 ("gráficas de progreso por ejercicio"). Requires per-set logging to have meaningful data first — so the dependency is: per-set logging → weight progress charts. |
| Training streak / consistency count | "12 sessions in a row" is a powerful retention mechanic. Every fitness app that has implemented streaks sees daily active user improvement | Low | In .ini as Phase 6 ("Racha de entrenamiento"). |

---

## Anti-Features

Things to deliberately NOT build, with the reason why.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app chat / messaging | Adds async communication overhead (push notifications, read receipts, message threading) that is orthogonal to the core loop. Trainers who want chat use WhatsApp — they already have it | If trainers ask for it: add a WhatsApp deep-link button to the client profile. Cost: 30 minutes. Benefit: perceived as a feature. |
| Nutrition tracking | Changes the product from "workout delivery tool" to "health platform" — a completely different problem with different competitors (MyFitnessPal, Cronometer). Doing it badly is worse than not doing it | Document as Phase 8+ only, after product-market fit is confirmed. |
| In-app payments / subscriptions | Stripe + IAP (Apple/Google) integration is a significant engineering project with legal and financial implications (App Store 30% cut, refund policies, subscription management) | Post-MVP SaaS billing is best handled via Stripe on the web, not inside the mobile app. |
| Custom video upload | Firebase Storage egress costs for video are high. YouTube/Vimeo already solve discovery, playback, and CDN globally | Keep YouTube/Vimeo link fields. If a trainer asks "can I upload my own?", explain that YouTube handles quality, bandwidth, and playback better than anything you'd build. |
| Wearable / Health kit integration | Apple HealthKit and Google Fit require native modules that complicate the Expo managed workflow, plus the data (steps, HRV) is not actionable in a program-delivery context at MVP | The client dashboard mockup shows steps/BPM/calories/sleep — these are aspirational designs, not MVP requirements. Keep them out of MVP scope. |
| Multi-trainer / gym admin | The data model (`trainerId` as a flat field on exercises, routines, programs) is architected for a single trainer. Sharing resources between trainers requires a permissions model that doesn't exist yet | Ship single-trainer first. Multi-trainer can be added in Phase 8 when you have real data on how trainers want to share. |
| Built-in weight/measurement logging (body metrics) | Separate from exercise performance tracking. Body weight charts require a new MEASUREMENTS collection and a dedicated UX flow. The client dashboard mockup shows a body weight chart — keep it as a Phase 6 target only | Direct clients to use a separate app (Strong, Hevy, Apple Health) for body measurements until Phase 6. |
| Public program marketplace | Turning this into a marketplace where trainers sell programs to unknown clients is a fundamentally different business model. It requires reviews, payments, refunds, and content moderation | Focus on the private trainer-client relationship for all MVP phases. |
| AI-generated workout recommendations | "AI-suggested programs" is table stakes in consumer fitness (Nike Training, Peloton) but in the trainer-client context, the trainer IS the intelligence. Adding AI suggestions undermines the trainer's perceived value | Never. The trainer's expertise is the product. |

---

## Competitor Analysis

**Confidence:** MEDIUM — Based on training data (knowledge cutoff August 2025). Web access was unavailable during this research session. Verify specific pricing or recent feature releases before using this data to make product decisions.

### Trainerize

The most widely used trainer-client platform. Used by independent trainers, boutique gyms, and franchises.

**Trainer → Client workflow:**
1. Trainer creates exercises in a global library (shared across all clients).
2. Trainer builds "workouts" (equivalent to LauFit routines) and "programs" (multi-week blocks).
3. Programs are assigned to a client with a start date. Trainerize calculates the "today" screen automatically.
4. Client opens the app and sees their scheduled workout. They log each set with actual weight/reps.
5. Trainer sees completed sessions in the client dashboard, including individual set logs.

**Key Trainerize patterns relevant to LauFit:**
- Exercise library is **trainer-owned and reusable** across all clients — identical to LauFit's model.
- Programs use a **numbered day model** (Day 1, Day 2... Day 84 for a 12-week program), not a Monday-Friday calendar model. This avoids timezone issues and makes it trivial to pause/resume. LauFit's current model uses the same approach.
- **Set logging is table stakes** in Trainerize — clients log weight + reps per set, and the app pre-fills last session's values. This is the biggest gap in LauFit's current SESSION data model.
- Trainerize supports **supersets** and **circuits** as exercise group types within a workout.
- The **trainer dashboard** shows a color-coded calendar of each client's activity — green = trained, red = missed, grey = rest. LauFit's adherence percentage (US-16) is a simplified version of this.
- Trainerize supports **trainer notes per exercise** visible to the client during execution — identical to the note field already in LauFit's ROUTINES exercise array.
- Trainerize supports **video tutorials** via YouTube URL, exactly as LauFit plans.

**What Trainerize does NOT do well:**
- UX is dated — busy, low contrast, visually overwhelming. This is LauFit's design opening.
- The program builder is powerful but slow — creating a 4-week program takes 10-15 minutes. LauFit's "under 3 minutes" goal is a genuine differentiator if achieved.
- Mobile app feels web-ported rather than mobile-native.

### TrueCoach

Simpler, cleaner than Trainerize. Positioned as the "modern" trainer-client platform. Smaller feature set, better UX.

**Key TrueCoach patterns relevant to LauFit:**
- **Daily workout delivery** is the core loop, identical to LauFit.
- TrueCoach uses a **date-scheduled model** (workouts are assigned to specific calendar dates, not program day numbers). This is different from LauFit's numbered-day approach and has the timezone/calendar complexity that LauFit's model intentionally avoids.
- TrueCoach supports **trainer comments on exercises** (notes field). Treated as a first-class feature, not an afterthought.
- **Client response / feedback per session** — after completing a workout, clients can leave a short note ("felt strong today, left 2 reps in the tank"). Trainers see this. This is a lightweight substitute for in-app chat.
- TrueCoach supports **video assignment** via YouTube/Vimeo links — same as LauFit.
- TrueCoach has a **very clean client UI** with minimal cognitive load — relevant to LauFit's design goals.

**What TrueCoach does NOT do well:**
- No gym/home toggle — programs are single-track. LauFit's gym/home variant model is a genuine differentiator here.
- Limited exercise categorization — no location type filtering.
- No superset support (as of knowledge cutoff).

### PT Distinction

More business-focused platform — built for trainers managing 20+ clients with automation features (email campaigns, habit tracking). Less relevant to LauFit's MVP scope.

**Key PT Distinction patterns relevant to LauFit:**
- Supports **exercise alternatives** at the program level — trainers can define a primary and alternative exercise per slot. Conceptually similar to LauFit's `alternativeExerciseId` pattern but more explicit in the UI.
- **Client check-in forms** — periodic forms (weekly weight, measurements, photos) separate from the workout log. Trainers use these to monitor progress between sessions.
- **Program templates** that trainers can clone and reuse across clients — very similar to LauFit's routine template model.

**What PT Distinction does NOT do well:**
- Complex to set up — high learning curve for a solo trainer.
- UI is heavily form-based rather than experience-driven.

### Mindbody

Class-booking platform, not a program-delivery platform. Largely irrelevant to LauFit's trainer-client model. The comparison is mostly a category error.

**The only relevant Mindbody pattern:**
- **Trainer profile as a product** — trainers have public profiles with availability, specialty, and client reviews. This is relevant to LauFit's post-MVP marketplace direction (Phase 9 in the .ini) but not to MVP.

---

## Gaps vs LauFit Scope

The following are features or data model decisions that trainers expect as standard, that are missing or underspecified in the current LauFit scope.

### Gap 1: Per-Set Performance Logging (HIGH PRIORITY)

**What's missing:** The current SESSIONS data model stores `completedExercises: [{exerciseId, completed: boolean, variantUsed}]`. This only records "did the client do this exercise." Trainers and clients both expect to record **what weight and how many reps were done on each set.**

**Evidence from mockups:** The `rutina_del_dia` mockup renders a full per-set table with columns: SET, PESO (KG), REPS, RPE, STATUS — and even shows editable weight inputs per row. The designs are already ahead of the data model.

**Recommended addition to SESSIONS data model:**
```
completedExercises: [
  {
    exerciseId: string,
    completed: boolean,
    variantUsed: "gym" | "home" | null,
    sets: [
      {
        setNumber: number,
        targetReps: number,       // from the program
        actualReps: number | null,
        actualWeight: number | null,
        weightUnit: "kg" | "lb",
        rpe: number | null,        // optional
        completedAt: timestamp
      }
    ]
  }
]
```

**Impact if missing:** Session history is meaningless for strength tracking. Trainers who currently track sets/reps in a spreadsheet will revert to the spreadsheet.

### Gap 2: Rest Timer Logic

**What's missing:** C05 ("Descanso Timer") is a named screen with no implementation details. The `.ini` lists it in the screen inventory but the exercise model has a `defaultRest` field without any runtime timer logic specified.

**Required behavior:**
- When a client checks a set as done, automatically start the rest countdown using the exercise's `rest` value (in seconds).
- Countdown is shown full-screen or as a persistent banner.
- Client can skip or extend the rest.
- The timer must run when the app is backgrounded (at minimum 30 seconds — full background audio requires a different Expo plugin).

**Impact if missing:** Clients will use their phone clock between sets, which breaks the app flow and invites distraction.

### Gap 3: Session State Persistence (Auto-Save)

**What's missing:** The `.ini` flags this as a "High" impact risk but does not specify the implementation. The session must be written to Firestore as the client progresses — not only on "Finish Session."

**Pattern to follow:**
- On login for the day, check if an in-progress session exists (status: "partial", same date). If yes, resume it.
- Write to Firestore on every set completion (`PUT /sessions/:id`), not on final submit.
- Treat session as "partial" until the client explicitly presses "Finish Session."

**Impact if missing:** A client who completes 4 of 6 exercises and their phone dies loses everything. This is a trust-killer.

### Gap 4: Exercise Notes Visible During Execution

**What's missing:** The ROUTINES data model has a `notes: string?` field per exercise entry. But the client execution flow (US-12, C03/C04) does not explicitly mention surfacing these notes.

**Required behavior:**
- When the trainer writes a note on an exercise in a routine (e.g., "keep elbows in, 3-second eccentric"), the client sees this note inline in the exercise detail view.
- Notes are read-only for the client.

**Impact if missing:** The trainer's guidance disappears. The note field is already in the data model — surfacing it in the UI is a low-effort, high-value addition.

### Gap 5: "Already Trained Today" Guard

**What's missing:** What happens if the client opens the app a second time on the same day after completing their session? The "today's workout" screen has no specified behavior for this case.

**Required behavior:**
- If a SESSIONS record exists for today (same date, status: "completed"), show a "You already trained today" state — display the session summary with a "view details" option rather than showing the workout again as if incomplete.
- This prevents accidental duplicate session creation.

### Gap 6: Trainer Adherence Metric on Dashboard

**What's specified:** US-16 mentions "porcentaje de adherencia (sesiones completadas / sesiones programadas)" as a criteria for the client history screen.

**What's missing:** This metric should also appear on the trainer's main client list (T04) as a visible number or indicator — not buried in a history subscreen. Trainers with 10+ clients need to see at a glance who is falling behind.

**Recommended UI addition:** On each client card in T04 (Lista de Clientes), add an adherence badge (e.g., "92%" in green, "43%" in amber) calculated as sessions completed in the last 30 days divided by sessions scheduled.

---

## UX Patterns

### Today's Workout Calculation

The `.ini` documents the core algorithm: `currentDay = floor((today - startDate) / dayDuration) + 1`. The day maps to `PROGRAMS.days[currentDay]`. If `days[currentDay].isRest` is true, show rest screen. If `days[currentDay].routineId` exists, show that routine.

**Critical implementation detail — timezone handling:**
- Use UTC dates with time stripped for all day calculations. Store `startDate` as a UTC date (midnight UTC), not a timestamp.
- Compute `currentDay` using the client's local date, not UTC. A client in UTC-5 who trains at 9pm should see the correct day for their timezone, not tomorrow's.
- The `.ini` recommends: "Usar fechas UTC + lógica de días numerados, no fechas absolutas." The numbered-day model is correct and timezone-safe if implemented as: `dayNumber = floor((localDateToday - localDateStart) in days) + 1`.

**Program loop handling:**
- When `dayNumber > program.durationWeeks * 7`, the program is complete. Show a "Program complete" state and notify the trainer.
- The current ASSIGNMENTS model supports this via `status: "completed"`. The trainer should get a notification or dashboard alert when a client's program ends.

### Gym/Home Toggle

The scoped approach (`alternativeExerciseId` cross-reference on routine exercises) is the right call. Based on competitor patterns:

**Recommended UX pattern:**
- Show the toggle at the top of the "today's workout" screen, not inside individual exercise cards. One global session-level toggle — not a per-exercise choice.
- When the toggle changes, exercises that have an alternative swap in real time. Exercises without an alternative stay the same and are not highlighted.
- The selected mode (gym/home) persists for the entire session and is written to `SESSIONS.locationMode`.
- If an exercise has no alternative, it should not show a "gym/home" indicator at all — only exercises with both variants should react to the toggle.

**Toggle placement specifics:**
- A segmented control or pill toggle at the top of C02 (Home / Hoy) or C03 (Ejecutar Workout) — not in a settings screen.
- Use clear labels: "GYM" / "HOME" not icons alone — icons (dumbbell vs. house) are ambiguous to non-English speakers and to first-time users.
- Persist the user's last choice using device storage (AsyncStorage/MMKV) so the client doesn't re-select every session.

### Set Completion Micro-Interaction

The `rutina_del_dia` mockup already shows the correct pattern: checking a set row dims it (opacity 40%, grayscale) and triggers haptic feedback (`navigator.vibrate(50)`). This communicates "done, move on" without removing the row from view (client still needs to reference what weight they did for the next set).

**Key implementation detail:** Mark individual sets as done, not the whole exercise. The exercise is marked complete when all sets are checked (or the trainer-defined set count is reached). The "FINALIZAR SESIÓN" FAB should only enable when all exercises are fully checked or the client has explicitly skipped them.

### Empty States

Every screen must have a designed empty state, not a blank view. Priority:

| Screen | Empty State |
|--------|-------------|
| Client home — no program assigned | "Your trainer hasn't assigned a program yet. Check back soon." with a placeholder icon |
| Client home — rest day | "Rest day. Recovery is training." with a rest-day visual, date, and next workout preview |
| Client home — program complete | "Program complete! Great work. Your trainer will assign your next one." |
| Trainer client list — no clients | "Add your first client to get started." with a large + CTA |
| Session history — no history | "No sessions yet. Complete your first workout!" |

### In-Session Navigation Guard

When a client is mid-workout, pressing back or switching apps should trigger a "save and exit" confirmation — not silently lose progress. The session is auto-saved to Firestore, but the client should see: "Your progress has been saved. You can resume later."

### Rest Day Screen

The rest day screen (C02 variant) should:
- Show the day name and a motivational line
- Show what the next workout is ("Tomorrow: Upper Body A")
- NOT show the workout list (confusing)
- NOT show a "Start Workout" button

This prevents clients from accidentally trying to execute a non-existent workout.

### Trainer Program Builder Drag and Drop

The constructor mockup already uses drag handles (`drag_indicator` icon + grab cursor). React Native drag-and-drop for exercise reordering requires `react-native-draggable-flatlist` (well-maintained, Reanimated-compatible) or the built-in drag in `react-native-gesture-handler` + `react-native-reanimated`. Do not attempt to build this with `Animated.API` alone.

**Pattern recommendation:**
- Exercises within a routine: drag-to-reorder using `react-native-draggable-flatlist`
- Days within a program: same library, but at the day-card level
- Supersets (post-MVP): drag-to-group is a harder problem — research `react-native-sortable` when that feature is scoped
