# Phase 02 — Completion Record

**Completed:** 2026-06-02. On-device smoke test PASSED; phase marked complete.
**Status:** All 5 plans complete. Full trainer journey verified end-to-end on a real device.

## Plans

| Plan | State |
|------|-------|
| 02-01 Foundation | ✅ types, zod schemas, filter, typed collections, 5-tab trainer shell |
| 02-02 Exercise library | ✅ service/hooks/form + list/new/edit screens |
| 02-03 Clients tab | ✅ service/hooks/ClientPhoto/screens + firestore rules |
| 02-04 Routine builder | ✅ builder + bottom-sheet picker + drag-reorder + alternatives — **device-verified** |
| 02-05 Programs + assignment | ✅ program CRUD + Week×Day grid + createAssignment CF + assign flow — **device-verified** |

Tests: 63 app (react-native jest) + 8 Cloud Function = green. `tsc --noEmit` = 0.

## On-device smoke test — PASSED

Verified the full trainer journey on a real device: create exercises → build a routine
(with an alternative + drag-reorder) → build a program (Week×Day grid) → **assign to a
client** via the deployed Cloud Function → client row shows the program. Client login +
sign-out also verified.

## Deployed to laufit-dev (Blaze)

- Firestore **rules** + **indexes** (incl. assignments trainerId/clientId/status).
- Cloud Functions **createClientAccount** + **createAssignment** (Node 20, 1st gen, maxInstances 10),
  with `allUsers` Cloud Functions Invoker granted (see `scripts/grant-invoker.mjs` — re-run if a
  redeploy returns HTTP 403).

## Fixes made during on-device verification (all committed)

Root cause of the early white-screen/no-role/permission-denied chain: **`@react-native-firebase`
v24 makes `DocumentSnapshot.exists` a METHOD** — `!snap.exists` was always false, so the user's
Firestore doc was never created. Plus: missing root `QueryClientProvider`; `stripUndefinedDeep`
before Firestore writes; `withSaveFeedback` on screen mutations; role self-provision rule;
lazy httpsCallable + Cloud Functions IAM invoker; routine-builder nested-scroll + alternative
display; program day-grid optimistic update + client picker inside RN Modal; assignment query
scoped by trainerId; tab icons; safe-area handling (SafeAreaProvider + context SafeAreaView +
tab-bar nav-bar inset); picker sheets `enableDynamicSizing={false}` + `bottomInset` + 92% snap.
See memory `rnfb-v24-exists-method`.

## Optional / deferred (non-blocking, for later)

- Firestore-rules **emulator** tests unrun locally (no JRE): run on a Java machine via
  `firebase emulators:exec --only firestore "npx jest --selectProjects firestore-rules"`.
- Cloud Functions on deprecated **Node 20** (decommissioned 2026-10-30) + `firebase-functions` v5
  — bump to Node 22 + latest when convenient.
- Client-side profile name shows empty for email/password trainers (no displayName) — cosmetic.

## Git

GitHub: `git@github.com:Rquesada06/TrainingCenter.git`, branch `main`. All work pushed.
No worktrees; all plans executed sequentially on the main tree.
