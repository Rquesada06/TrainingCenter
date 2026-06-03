# Phase 3: Client Workout Execution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 3-client-workout-execution
**Areas discussed:** Today's-workout logic, Session execution UX, Gym/home toggle, Finish/resume/duplicate guard

---

## Today's-workout logic — program end

| Option | Description | Selected |
|--------|-------------|----------|
| Show 'Program complete' | Terminal done state after the last day; trainer assigns next | ✓ |
| Loop back to week 1 | Repeat the program indefinitely | |
| Hold on the last day | Keep showing the final day | |

**User's choice:** Show 'Program complete'.
**Notes:** Programs are finite; the trainer assigns a new one to continue. No loop, no hold.

---

## Session execution UX

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable list | Inline checkboxes; tap row to expand detail in place | ✓ |
| One exercise per screen | Full-screen, swipe/Next to advance | |
| List → detail screen | Compact list, separate detail screen per exercise | |

**User's choice:** Single scrollable list with inline checkboxes + expand-in-place detail (video/image inline).

---

## Gym/home toggle — exercise with no valid variant for the chosen mode

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it, show a small note | Always show; subtle 'gym only'/'home only' tag | ✓ |
| Mark unavailable, allow skip | Grey it as 'not available at home' | |
| Hide it for that mode | Remove from the list while in that mode | |

**User's choice:** Keep it and show a small note. Never drop trainer-programmed work.

---

## Already-completed-today home state (duplicate guard)

| Option | Description | Selected |
|--------|-------------|----------|
| 'Workout complete' until tomorrow | Done state + summary, no new session today | |
| Done state + view session | Done state, can re-open today's session read-only | ✓ |
| Just the normal rest state | Treat completed like a rest day | |

**User's choice:** Done state + ability to re-open today's completed session read-only.

---

## Crash-safe resume

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt: Resume / Start over | Ask on reopen; restore checks + mode on Resume | ✓ |
| Auto-resume silently | Restore state without asking | |

**User's choice:** Prompt "Resume / Start over" on reopen.

---

## Gym/home default mode

| Option | Description | Selected |
|--------|-------------|----------|
| Default to Gym each session | Always start in Gym | |
| Remember last choice | Persist last mode across sessions | ✓ |

**User's choice:** Remember last choice (first-ever session defaults to Gym).

---

## Finish with incomplete exercises

| Option | Description | Selected |
|--------|-------------|----------|
| Always allow, confirm if incomplete | 'Finish with X of Y done?' confirmation | ✓ |
| Enabled only when all checked | Button disabled until all complete | |

**User's choice:** Always allow; confirm when not all exercises are checked.

---

## Rest-day motivational message

| Option | Description | Selected |
|--------|-------------|----------|
| Rotating from a small set | Different short line each rest day (by date) | ✓ |
| Single static message | One fixed line | |

**User's choice:** Rotating from a small built-in set.

---

## Claude's Discretion

- Exact Firestore `sessions` record field shape.
- Celebration/summary screen content + copy for the various empty/terminal states.
- AsyncStorage dependency install + the read-only completed-session view implementation.

## Deferred Ideas

- Session history / progress stats (future phase).
- Trainer-side review of client sessions (future phase).
- Push notifications / reminders (future phase).
- Client profile editing (future phase).
