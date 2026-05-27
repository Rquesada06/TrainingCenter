---
phase: 1
slug: infrastructure-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (via `jest-expo`) |
| **Config file** | `jest.config.js` — Wave 0 installs |
| **Quick run command** | `npx jest --testPathPattern=src/__tests__/auth` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=src/__tests__/auth`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green + EAS dev build boots on device
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 01-firebase-setup | 1 | AUTH-01 | manual | `npx expo start --dev-client` (no crash) | ⬜ pending |
| 01-auth-store | 1 | AUTH-03, AUTH-05 | unit | `npx jest authStore` | ⬜ pending |
| 01-auth-guard | 1 | AUTH-05 | unit | `npx jest authGuard` | ⬜ pending |
| 01-login-screen | 2 | AUTH-01, AUTH-02 | manual | login with real credentials on dev build | ⬜ pending |
| 01-password-reset | 2 | AUTH-04 | manual | reset email received + link works | ⬜ pending |
| 01-role-routing | 2 | AUTH-01, AUTH-02 | manual | trainer lands on trainer shell, client on client shell | ⬜ pending |
| 01-cloud-function | 3 | CLNT-01 | manual | trainer creates client, client logs in immediately | ⬜ pending |
| 01-security-rules | 3 | AUTH-01–05 | manual | Firebase rules simulator in console | ⬜ pending |
| 01-firestore-indexes | 3 | — | automated | `firebase deploy --only firestore:indexes` exits 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest.config.js` — configured for `jest-expo` preset
- [ ] `src/__tests__/auth/authStore.test.ts` — stubs for AUTH-01 through AUTH-05
- [ ] `src/__tests__/auth/authGuard.test.ts` — stub for isLoaded guard logic
- [ ] `@testing-library/react-native` installed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No login flash on cold start | AUTH-05 | Requires real device, not simulator | Kill app, reopen, observe: splash shows, then home (not login) for authenticated user |
| Trainer creates client via Cloud Function | CLNT-01 | Requires live Firebase Functions deployment | Trainer fills form, submits, check Firebase Console for new Auth user + USERS doc |
| Security rules block role elevation | AUTH-01 | Requires Firebase rules simulator | In Firebase Console, simulate client writing `role: "trainer"` to own USERS doc — must return PERMISSION_DENIED |
| Password reset email arrives | AUTH-04 | Email delivery is external | Trigger reset for real email address, verify receipt within 2 minutes |
| EAS dev build boots without crash | AUTH-01 | Native build verification | `eas build --profile development`, install on device, confirm no native crash |

---

## Validation Architecture (from RESEARCH.md)

### Automated (Jest + jest-expo)
- `authStore.ts` pure logic: `isLoaded` transitions, `role` extraction from Firestore, `signOut` clears state
- `workout-calculator.ts` (seeded here for Phase 3): pure function, `differenceInCalendarDays` timezone edge cases
- Auth guard: `Stack.Protected` `guard` prop receives correct boolean from `authStore`

### Manual Device Verification
- Cold-start splash (no login flash) — requires real device, real Firebase
- Role-based routing after login — trainer vs client nav shell
- Cloud Function invocation from trainer UI
- Firestore security rules via Firebase Console simulator

### CI/CD Checks
- `npx expo-doctor` — validates all native dependencies for SDK 55
- `npx jest` — unit tests green
- TypeScript: `npx tsc --noEmit` — no type errors
- `firebase deploy --only firestore:rules,firestore:indexes` — rules and indexes deployable

---

*Phase: 01-infrastructure-auth*
*Validation strategy created: 2026-05-27*
