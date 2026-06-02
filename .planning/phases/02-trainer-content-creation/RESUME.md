# Phase 02 — Resume Handoff

**Paused:** 2026-06-02 (mid-afternoon). Resuming later same day.
**Status:** All 5 plans code-complete & committed. Phase at verification stage with deferred manual-UAT items. NOT yet marked verified/complete.

## Where we are

| Plan | State |
|------|-------|
| 02-01 Foundation | ✅ complete (types, zod schemas, filter, typed collections, 5-tab trainer shell) |
| 02-02 Exercise library | ✅ complete (service/hooks/form/screens) |
| 02-03 Clients tab | ✅ complete (service/hooks/ClientPhoto/screens, firestore rules) |
| 02-04 Routine builder | ✅ code-complete — **device drag-reorder UX test DEFERRED to UAT** |
| 02-05 Programs + assignment | ✅ code-complete — **CF deploy + end-to-end smoke test DEFERRED to UAT** |

Tests: 63 app (react-native jest) + 8 Cloud Function = green. `tsc --noEmit` = 0.

## ▶ Resume steps (do these to finish the phase)

1. **Deploy the assignment Cloud Function** (needs Firebase **Blaze** plan; Spark blocks Functions deploy):
   ```
   cd functions && npm run build && firebase deploy --only functions:createAssignment --project laufit-dev
   ```
   Verify `createAssignment` (v1) appears in Console → Functions.
2. **Run the on-device end-to-end smoke test** (the 3-min trainer journey) — full 7-step script is in the Task 4 checkpoint of `02-05-SUMMARY.md`: create 3 exercises → routine "Full Body A" (w/ alternative + drag) → program (2 wks, assign routine to 2 days) → assign to a client (verify ASGN-02 overwrite warning) → confirm `assignments/{id}` snapshot in Firestore + prior assignment set to `completed` + Clients tab shows program in green.
3. **Verify 02-04 on device**: bottom-sheet picker + drag-reorder UX (watch for Reanimated v4 flicker, RESEARCH Pitfall 1).
4. Once UAT passes → run phase verification (`gsd-verifier`) → mark phase complete.

## Deferred / known-pending

- **Firestore rules emulator tests** unrun in this environment (no JRE). Run on a Java machine:
  `firebase emulators:exec --only firestore "npx jest --selectProjects firestore-rules"` (covers 02-01/02-03/02-05 denial cases).
- Cloud Function `createAssignment` NOT deployed yet (step 1 above). Assignment submit will fail until deployed.
- Firestore **rules + indexes ARE deployed** to laufit-dev (done this session).

## Important context — app-wide fixes made this session (debugging the trainer shell)

The on-device test surfaced pre-existing + integration defects, all fixed & committed:
- **`snap.exists()` is a METHOD in @react-native-firebase v24** (commit `a2de4d1`). `!snap.exists` was always false → the trainer's Firestore `users/{uid}` doc was never created → no role → white screen + permission-denied. Root cause of the whole saga. See memory `rnfb-v24-exists-method`.
- Root **`QueryClientProvider`** was missing (`bb7ae20`) — every react-query hook threw "No QueryClient set".
- **`stripUndefinedDeep`** before Firestore writes (`acf6e50`) — blank optional fields (undefined) crashed writes.
- **`withSaveFeedback`** wraps screen mutations (`acf6e50`) — failed saves now alert instead of crashing.
- Firestore rule: **self-provision a missing/invalid role** to trainer on own doc (`552feca`, `98cd763`, deployed).
- **Sign-out button** added to trainer Profile (`270028e`).

These patterns are now established — any new get-existence check must use `snap.exists()`, new Firestore writes use `stripUndefinedDeep`, new screen mutations use `withSaveFeedback`.

## Git

- GitHub remote: `git@github.com:Rquesada06/TrainingCenter.git` (SSH), branch `main`. All work pushed at pause.
- No worktrees in use; all plans executed sequentially on the main tree.
