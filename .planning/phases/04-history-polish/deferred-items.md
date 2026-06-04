# Deferred Items — Phase 04

Out-of-scope discoveries logged during execution. NOT fixed in the discovering plan.

## From 04-02 (storage + profile hooks)

### assignment.service.test.ts fails with `RNFBAppModule not found`
- **Discovered during:** 04-02 Task 4 (full react-native suite run)
- **Symptom:** `src/services/__tests__/assignment.service.test.ts` fails to run —
  `Native module RNFBAppModule not found` when `@/firebase/firestore` imports
  `@react-native-firebase/firestore`.
- **Root cause:** The test mocks `@/firebase/functions` and `@/services/client.service`
  but does NOT mock `@react-native-firebase/firestore`. `assignment.service.ts` imports
  `@/firebase/firestore` (which imports the native RNFB firestore module), so the
  unmocked native module init throws at import time.
- **Scope:** Pre-existing — the file was last modified in Phase 02 (commit 9bf2c2e),
  untouched by 04-02. Not caused by storage.service / useUser / useUpdateProfile.
- **Fix (future):** Add a `jest.mock('@react-native-firebase/firestore', ...)` hoisted
  factory to assignment.service.test.ts (mirror client.service.test.ts), OR mock
  `@/firebase/firestore` directly. Suite was passing 19/20 otherwise (141 passed, 1 skipped).
