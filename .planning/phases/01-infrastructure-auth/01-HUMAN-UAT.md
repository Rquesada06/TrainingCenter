---
status: partial
phase: 01-infrastructure-auth
source: [01-VERIFICATION.md]
started: 2026-05-28T16:00:00Z
updated: 2026-05-28T16:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Trainer Login and Session Persistence (AUTH-01, AUTH-03)
expected: Trainer lands on the Trainer Dashboard screen on first sign-in. On reopen, trainer is still authenticated and lands directly on the Trainer Dashboard (no sign-in screen shown).
result: [pending]

### 2. Client Login via Trainer-Created Account (AUTH-02, CLNT-01)
expected: Client lands on the Client Home screen. A Firestore `users/{uid}` document exists with `role:'client'` and `trainerId` set to the trainer's uid.
result: [pending]

### 3. Cold-Start Splash Guard (AUTH-05)
expected: Native splash screen remains visible until the auth event fires. No brief flash of the sign-in screen or any protected screen before auth resolves.
result: [pending]

### 4. Password Reset Email Delivery (AUTH-04)
expected: Banner "If that email exists, a reset link has been sent." appears on screen. A password reset email arrives at the specified address within 2 minutes.
result: [pending]

### 5. Firebase Emulator Test Suites (CLNT-01 full coverage)
expected: All 4 createClientAccount behaviors pass. All 5 rules behaviors pass.
commands:
  - firebase emulators:exec --only auth,firestore "npx jest --testPathPattern=createClientAccount"
  - firebase emulators:exec --only firestore "npx jest --testPathPattern=rules"
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
