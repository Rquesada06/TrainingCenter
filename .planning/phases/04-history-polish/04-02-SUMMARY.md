---
phase: 04-history-polish
plan: "02"
subsystem: infra
tags: [firebase-storage, firestore, expo-image-picker, tanstack-query, profile-photo, putFile, security-rules]

# Dependency graph
requires:
  - phase: 01-infrastructure-auth
    provides: Firestore typed collection helpers (usersCollection) + stripUndefinedDeep write-safety helper + RNFB v24 patterns
  - phase: 02-trainer-content-creation
    provides: getClient single-doc users-collection read (reused by useUser) + useUpdateClient mutation template

provides:
  - storage.rules (PROF-03 / T-04-03) — path-scoped request.auth.uid == userId enforcement under users/{userId}/**
  - firebase.json storage entry (registers storage.rules for deploy)
  - expo-image-picker installed (~55.0.20) + config-plugin permission strings in app.config.js (native rebuild deferred to 04-07)
  - uploadProfilePhoto(uid, fileUri) — storage().ref(users/{uid}/profile.jpg).putFile + getDownloadURL (PROF-02)
  - updateUserProfile(uid, partial) — usersCollection().doc(uid).update(stripUndefinedDeep) photoURL/name only (PROF-01)
  - useUser(uid) hook — single user-doc query under ['user', uid]
  - useUpdateProfile() mutation — invalidates ['user', uid] + ['client', uid]
  - Wave 0 storage.service unit tests (5 tests green)

affects:
  - 04-06 (profile screens — consume useUser + useUpdateProfile + uploadProfilePhoto)
  - 04-07 (native dev-client rebuild + on-device photo UAT — image-picker usable only after rebuild; live storage deploy must precede on-device upload)

# Tech tracking
tech-stack:
  added:
    - "expo-image-picker (~55.0.20) — camera/library photo picker (config-plugin; native rebuild deferred to 04-07)"
  patterns:
    - "Firebase Storage upload: storage().ref(users/{uid}/profile.jpg).putFile(file:// URI) then getDownloadURL() — path scoped to own uid (T-04-03)"
    - "RNFB storage jest mock: hoisted factory { default: storageFn } with ref()->{putFile,getDownloadURL}; __esModule default export (storage is a default import)"
    - "Profile write allowlist: updateUserProfile only ever writes photoURL/name via stripUndefinedDeep — role/trainerId locked server-side (T-04-04)"
    - "useUser reuses getClient under ['user', uid] key so profile screen + useUpdateProfile invalidation share one cache entry"

key-files:
  created:
    - storage.rules
    - src/services/storage.service.ts
    - src/services/__tests__/storage.service.test.ts
    - src/hooks/useUser.ts
    - src/hooks/useUpdateProfile.ts
  modified:
    - firebase.json
    - app.config.js
    - package.json

key-decisions:
  - "useUser reuses getClient (generic users-doc read) under ['user', uid] rather than adding a redundant getUser — same doc, clearer key"
  - "updateUserProfile wraps partial in stripUndefinedDeep so photo-only and name-only saves never send undefined (Firestore rejects undefined)"
  - "Live `firebase deploy --only storage` deferred to orchestrator — requires user to enable Storage bucket in Firebase console first"

patterns-established:
  - "RNFB Storage mock factory (new — no prior analog): { __esModule: true, default: storageFn } because storage is imported as a default"
  - "Photo upload path is always users/{uid}/profile.jpg — single canonical key per user (overwrites prior photo, no orphan accumulation)"

requirements-completed: [PROF-01, PROF-02, PROF-03]

# Metrics
duration: ~15min (Task 4 continuation; Tasks 1-3 in prior commits)
completed: 2026-06-04
---

# Phase 04 Plan 02: Profile Photo Infrastructure Summary

**Firebase Storage upload service (putFile + getDownloadURL), path-scoped storage.rules, profile write/read hooks, and expo-image-picker install — the only new native+Firebase infrastructure in Phase 4.**

## Performance

- **Duration:** ~15 min (Task 4 only — this agent executed the TDD service/hooks task; Tasks 1–3 completed in earlier commits)
- **Completed:** 2026-06-04T23:29Z
- **Tasks:** 4 (Task 1 supply-chain gate + Tasks 2–4 implementation)
- **Files modified/created (this plan, total):** 8

## Accomplishments
- `uploadProfilePhoto` + `updateUserProfile` service with 5 green Wave 0 unit tests (TDD RED→GREEN)
- `useUser` + `useUpdateProfile` TanStack Query hooks wired to the `['user', uid]` cache key
- `storage.rules` enforcing `request.auth.uid == userId` under `users/{userId}/**` (PROF-03 / T-04-03), registered in `firebase.json`
- `expo-image-picker` (~55.0.20) installed + config-plugin permission strings added to `app.config.js`
- `npx tsc --noEmit` clean; full react-native suite green except one pre-existing, unrelated failure (logged to deferred-items.md)

## Task Commits

1. **Task 2: Install + configure expo-image-picker** - `9b2c7e1` (feat) — _prior commit_
2. **Task 3: storage.rules + firebase.json storage entry** - `c0e31bb` (feat) — _prior commit_
3. **Task 4 (RED): failing storage.service tests** - `f0f6f4a` (test)
4. **Task 4 (GREEN): storage.service + useUser + useUpdateProfile** - `3a55bbb` (feat)

_Task 1 was a blocking-human supply-chain checkpoint (expo-image-picker provenance), approved before the install in Task 2._

## Files Created/Modified
- `storage.rules` (created) — Storage security rule: read/write allowed only when `request.auth.uid == userId` under `users/{userId}/**`
- `src/services/storage.service.ts` (created) — `uploadProfilePhoto(uid, fileUri)` (putFile + getDownloadURL) and `updateUserProfile(uid, partial)` (photoURL/name write via stripUndefinedDeep)
- `src/services/__tests__/storage.service.test.ts` (created) — 5 unit tests: upload path scoping, putFile/getDownloadURL call + return, undefined-strip for photo-only and name-only writes
- `src/hooks/useUser.ts` (created) — `useUser(uid)` single user-doc query under `['user', uid]`
- `src/hooks/useUpdateProfile.ts` (created) — mutation calling `updateUserProfile`, invalidating `['user', uid]` + `['client', uid]`
- `firebase.json` (modified) — added `"storage": { "rules": "storage.rules" }`
- `app.config.js` (modified) — added `expo-image-picker` plugin with photos + camera permission strings + rebuild-required comment
- `package.json` (modified) — `expo-image-picker` ~55.0.20 dependency

## Decisions Made
- **useUser reuses getClient** under the `['user', uid]` key rather than introducing a parallel `getUser` — it is the same generic users-collection single-doc read, and a clearer key keeps the profile screen and the mutation's cache invalidation aligned.
- **stripUndefinedDeep on every profile write** — photo-only and name-only saves arrive with the other field `undefined`; Firestore rejects undefined field values, so stripping is mandatory, not cosmetic.
- **Live storage deploy deferred to the orchestrator** — see User Setup Required.

## Deviations from Plan

None for the code — Task 4 executed exactly as written (TDD RED→GREEN, no auto-fixes needed). One out-of-scope discovery was logged, not fixed (see Issues Encountered).

## Issues Encountered
- **Pre-existing unrelated test failure:** `src/services/__tests__/assignment.service.test.ts` fails to run with `RNFBAppModule not found` because it does not mock `@react-native-firebase/firestore`. This file was last modified in Phase 02 (commit `9bf2c2e`) and is untouched by 04-02 — it imports nothing this plan created. Per the SCOPE BOUNDARY rule it was **not fixed**; logged to `.planning/phases/04-history-polish/deferred-items.md` with the root cause and the fix recipe. The rest of the suite is green: **141 passed, 1 skipped, 19 suites passing.**

## User Setup Required

**Firebase Storage must be enabled and the rules deployed before any on-device photo upload (04-07).**

The code is complete, but the live `firebase deploy --only storage` is **PENDING** and is the orchestrator's follow-up:

1. **User action (one-time):** Firebase Console → Build → Storage → **Get started** to enable a Storage bucket for `laufit-dev`.
2. **Orchestrator action:** run `firebase deploy --only storage --project laufit-dev` (falls back to `npx firebase-tools deploy --only storage` if the global CLI is absent). The rule (`request.auth.uid == userId`) must be live before the 04-07 on-device upload UAT.

`expo-image-picker` is installed and config-plugin-wired but will red-screen on the current dev client until the native rebuild in **04-07** — this is expected and intentional (rebuild deferred by design).

## Next Phase Readiness
- **04-06 (profile screens):** `useUser`, `useUpdateProfile`, and `uploadProfilePhoto` are ready to consume — service + hooks compile and are unit-tested.
- **04-07 (native rebuild + UAT):** Blocked on (a) the user enabling the Storage bucket, (b) the orchestrator running the storage deploy, and (c) the dev-client rebuild that activates expo-image-picker on device.
- **No code blockers** — the only outstanding items are the console bucket-enable + the deploy, both already routed to the user/orchestrator.

## Self-Check: PASSED

All created files verified on disk (storage.rules, storage.service.ts, storage.service.test.ts, useUser.ts, useUpdateProfile.ts, 04-02-SUMMARY.md) and all task commits present in git history (9b2c7e1, c0e31bb, f0f6f4a, 3a55bbb).

---
*Phase: 04-history-polish*
*Completed: 2026-06-04*
