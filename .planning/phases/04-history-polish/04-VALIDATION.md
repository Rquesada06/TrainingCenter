---
phase: 4
slug: history-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract. Derived from 04-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (react-native project) |
| **Config file** | `jest.config.js` — `projects[0]` |
| **Quick run command** | `npx jest --testPathPattern="adherence\|session.service\|storage.service" --passWithNoTests` |
| **Full suite command** | `npx jest --selectProjects react-native` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** quick command above.
- **After every plan wave:** full react-native suite.
- **Before `/gsd-verify-work`:** full suite green.

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| HIST-04 | `computeAdherence` returns correct % across day patterns (off-by-one + program-end cap) | unit (pure fn) | `npx jest adherence` | ❌ Wave 0 | ⬜ pending |
| HIST-01 | Paginated session list — page of 20, newest first, cursor advances | unit (mock firestore) | `npx jest session.service` | ❌ Wave 0 | ⬜ pending |
| HIST-03 | Trainer history uses same service fn scoped by clientId | unit (mock firestore) | `npx jest session.service` | ❌ Wave 0 | ⬜ pending |
| HIST-02 | Session detail resolves exercise names from the assignment snapshot | unit (pure fn) | `npx jest sessionDetail` | ❌ Wave 0 | ⬜ pending |
| PROF-01/02 | `uploadProfilePhoto` calls putFile + getDownloadURL | unit (mock storage) | `npx jest storage.service` | ❌ Wave 0 | ⬜ pending |
| PROF-03 | `updateUserProfile` writes photoURL to the user doc | unit (mock firestore) | `npx jest storage.service` | ❌ Wave 0 | ⬜ pending |
| criterion 5 | EmptyState renders on each empty list | component | manual verify | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/adherence.test.ts` — HIST-04 (day patterns, off-by-one, cap)
- [ ] `src/services/__tests__/session.service.test.ts` — HIST-01/03 pagination cursor
- [ ] `src/services/__tests__/storage.service.test.ts` — PROF-01/02/03 upload + Firestore write (mocked RNFB)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Photo pick (camera/library) → upload → display | PROF-01/02/03 | expo-image-picker needs a native dev build + device camera/library | On profile, Change photo → take/pick → square crop → confirm it uploads and the avatar updates (cached) |
| Storage rules enforce own-path only | PROF-03 | Requires deployed storage.rules + device | Confirm a user can write only `users/{own-uid}/...` (others denied) |
| History list pagination on device | HIST-01/03 | Needs >20 real sessions to page | Scroll the history list; confirm older pages load |
| Adherence % on client cards | HIST-04 | Needs real assignment + sessions | Verify the % matches completed ÷ scheduled-days-due for the current program |
| Empty states across all lists | criterion 5 | Visual | Open each list with no data; confirm a purposeful EmptyState (CTA where actionable) |
