---
phase: 04-history-polish
plan: "03"
subsystem: components/ui + components/sessions + components/clients
tags: [components, presentational, history, badges, empty-state]
dependency_graph:
  requires: []
  provides:
    - src/components/ui/EmptyState.tsx
    - src/components/sessions/StatusBadge.tsx
    - src/components/sessions/SessionListItem.tsx
    - src/components/clients/AdherenceBadge.tsx
  affects:
    - src/app/client/history.tsx (future 04-04)
    - src/app/trainer/clients/[clientId].tsx (future 04-04)
    - src/components/clients/ClientListItem.tsx (future 04-05)
tech_stack:
  added: []
  patterns:
    - derived-status: StatusBadge reads completedExerciseIds.length vs totalExercises (no stored status field, D-05)
    - date-format-guard: T00:00:00 suffix prevents UTC midnight timezone shift on YYYY-MM-DD strings
    - empty-state-cta: PrimaryButton reused for CTA; null for read-only lists (D-12)
    - adherence-thresholds: text-only color bands (yellow/white/green) — no background fill
key_files:
  created:
    - src/components/ui/EmptyState.tsx
    - src/components/sessions/StatusBadge.tsx
    - src/components/sessions/SessionListItem.tsx
    - src/components/clients/AdherenceBadge.tsx
  modified: []
decisions:
  - "EmptyState renders PrimaryButton CTA only when both ctaLabel and onCta are provided (D-12: omit for derived/read-only lists)"
  - "StatusBadge always derives status — no stored status field on Session (D-05)"
  - "T00:00:00 suffix on YYYY-MM-DD date strings prevents local-timezone midnight UTC shift"
  - "AdherenceBadge threshold boundaries: <50 yellow, 50-79 white, >=80 green (text-only, no bg fill)"
metrics:
  duration: "~10 min"
  completed_date: "2026-06-04T23:20:24Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 0
---

# Phase 04 Plan 03: Presentational Components Summary

**One-liner:** Four Obsidian Performance presentational components — EmptyState (icon+title+message+PrimaryButton CTA), StatusBadge (green Completed / yellow Partial derived from completedExerciseIds), SessionListItem (date + routineName + StatusBadge row), and AdherenceBadge (3-tier threshold text: yellow/white/green).

## What Was Built

### EmptyState (`src/components/ui/EmptyState.tsx`)
Reusable empty-list / no-data component implementing D-11/D-12. Props: `icon`, `title`, `message`, optional `ctaLabel` + `onCta`. The icon wrapper uses `accessibilityElementsHidden` (decorative). The CTA reuses `PrimaryButton` (solid variant) and renders only when both `ctaLabel` and `onCta` are provided. Typography: Heading (20px/600) title, Label (14px/400) message. Spacing: paddingVertical=48 (2xl), paddingHorizontal=24 (lg), marginBottom=16 below icon, marginBottom=8 below title, marginTop=24 above CTA.

### StatusBadge (`src/components/sessions/StatusBadge.tsx`)
Implements D-05 — status is always derived, never read from a stored field. `isComplete = session.completedExerciseIds.length === session.totalExercises`. Completed variant: `rgba(0,255,102,0.12)` bg + `#00FF66` text "Completed". Partial variant: `rgba(255,214,0,0.12)` bg + `#FFD600` text "Partial N/M". accessibilityLabel on the View wrapper for screen reader context.

### SessionListItem (`src/components/sessions/SessionListItem.tsx`)
History row with Pressable bg=#1A1A1A, borderWidth=1, borderColor=#444444, borderRadius=8. Left column (flex=1): date formatted via `new Date(date + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})` in Body (16px/400 #FFFFFF); routineName in Label (14px/400 #888888 marginTop=2). Right: StatusBadge. minHeight=44 for touch target. accessibilityRole="button" with full label "{routineName} on {date}, {statusLabel}".

### AdherenceBadge (`src/components/clients/AdherenceBadge.tsx`)
Returns null when `adherence === null` (not started). Color function: `< 50` → `#FFD600`; `50–79` → `#FFFFFF`; `>= 80` → `#00FF66`. Text: `"{N}% adherence"` in Label (14px/400). accessibilityLabel on the container View: `"Adherence: {N} percent"`.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | EmptyState | f3ae5b9 | src/components/ui/EmptyState.tsx |
| 2 | StatusBadge + SessionListItem | 8ef4299 | src/components/sessions/StatusBadge.tsx, src/components/sessions/SessionListItem.tsx |
| 3 | AdherenceBadge | 3018936 | src/components/clients/AdherenceBadge.tsx |

## Verification

- `npx tsc --noEmit` passes (exit 0) after every task and in final run
- Existing auth test suite: 4/4 tests pass

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. These are pure presentational components with no data wiring (Wave 2 screen plans wire them to data per plan objective).

## Threat Flags

None. Pure presentational components with no data fetch, no write, no network surface, no auth paths.

## Self-Check: PASSED

Files exist:
- src/components/ui/EmptyState.tsx — FOUND
- src/components/sessions/StatusBadge.tsx — FOUND
- src/components/sessions/SessionListItem.tsx — FOUND
- src/components/clients/AdherenceBadge.tsx — FOUND

Commits exist:
- f3ae5b9 — FOUND
- 8ef4299 — FOUND
- 3018936 — FOUND
