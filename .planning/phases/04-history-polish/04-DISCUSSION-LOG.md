# Phase 4: History + Polish - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 4-history-polish
**Areas discussed:** Adherence formula, History scope & status, Profile photo capture & storage, Empty states

---

## Adherence — denominator ('programmed')

| Option | Selected |
|--------|----------|
| Elapsed scheduled workout days (non-rest days due so far) | ✓ |
| Total program workout days (fixed) | |
| Calendar days elapsed | |

**Choice:** completed ÷ scheduled workout days elapsed (capped at program end). "Are they keeping up."

## Adherence — partial counts?

| Option | Selected |
|--------|----------|
| Yes — showing up counts | ✓ |
| No — only full sessions | |

**Choice:** Any saved session for a scheduled day counts.

## Adherence — window

| Option | Selected |
|--------|----------|
| Current active program only | ✓ |
| All-time | |

**Choice:** Current program; resets per assignment.

## History — scope

| Option | Selected |
|--------|----------|
| All-time, newest first (one list, both roles) | ✓ |
| Per active program | |

**Choice:** All-time paginated, same component for client (own) and trainer (a client's).

## History — status display

| Option | Selected |
|--------|----------|
| Badge: Completed / Partial (X/Y) | ✓ |
| Just a count (X/Y) | |

**Choice:** Green "Completed" / yellow "Partial X/Y", derived from completedExerciseIds vs totalExercises.

## Profile photo — source

| Option | Selected |
|--------|----------|
| Camera + photo library | ✓ |
| Photo library only | |

**Choice:** Camera + library (expo-image-picker — native, needs rebuild).

## Profile photo — processing

| Option | Selected |
|--------|----------|
| Square-crop + resize (~512px) | ✓ |
| Upload as-is | |

**Choice:** Square crop + downscale before upload.

## Empty states

| Option | Selected |
|--------|----------|
| Shared component; CTA where actionable | ✓ |
| Shared component, message only | |

**Choice:** One EmptyState component; action CTA on actionable lists, message-only on derived lists.

## Claude's Discretion
- Pagination mechanism + page size; empty-state copy/icons; adherence rounding; session-detail name source; Storage path naming + old-photo deletion.

## Deferred Ideas
- Push notifications, in-app messaging, trainer editing a client's photo, analytics/charts — all post-MVP.
