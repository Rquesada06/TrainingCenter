---
phase: 04-history-polish
plan: 06
subsystem: ui
tags: [profile, expo-image-picker, firebase-storage, react-query, expo-image]

# Dependency graph
requires:
  - phase: 04-history-polish (04-02)
    provides: storage.service.ts (uploadProfilePhoto, updateUserProfile), useUser, useUpdateProfile, expo-image-picker install + permissions
provides:
  - PROF-01 client edits own name + profile photo (camera/library, square crop, upload, cached avatar)
  - PROF-02 trainer edits own name + profile photo
affects: [04-07, history-polish-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "expo-image-picker launchCameraAsync / launchImageLibraryAsync with allowsEditing + 1:1 aspect (square crop)"
    - "uploadProfilePhoto → getDownloadURL → updateUserProfile (photoURL) via useUpdateProfile mutation"
    - "expo-image avatar keyed on photoURL for cache-busting refresh after upload"

key-files:
  created: []
  modified:
    - src/app/client/profile.tsx
    - src/app/trainer/profile.tsx

key-decisions:
  - "Each user edits only their own profile (D-07) — uid from authStore, no cross-user write path"
  - "Photo source offered via Alert action sheet (Take Photo / Choose from Library / Cancel)"

patterns-established:
  - "Profile photo edit flow: pick (camera|library, square) → upload to users/{uid}/profile.jpg → write photoURL → invalidate user query"

requirements-completed: [PROF-01, PROF-02]

# Metrics
duration: ~2 waves (parallel Wave 2; cut off by session limit but both tasks committed)
completed: 2026-06-05
---

# Phase 04 Plan 06: Profile Name + Photo Edit (Client + Trainer) Summary

**Both profile screens upgraded from sign-out-only to full name + photo editing, using the Wave 1 storage infrastructure (storage.service, useUpdateProfile, useUser) and expo-image-picker — each user edits only their own profile.**

## Accomplishments
- PROF-01: `src/app/client/profile.tsx` — editable name field + photo edit (camera/library → square crop → `uploadProfilePhoto` → `updateUserProfile`); avatar renders via expo-image and refreshes from the new photoURL.
- PROF-02: `src/app/trainer/profile.tsx` — same name + photo edit flow for the trainer's own profile.
- Both screens write only `users/{own-uid}` (D-07); name/photo changes go through `useUpdateProfile` (Firestore write wrapped per conventions).

## Task Commits
1. **Task 1: Client profile — name + photo edit (PROF-01)** - `d02e53e` (test, failing) → `3b8b288` (feat)
2. **Task 2: Trainer profile — name + photo edit (PROF-02)** - `fd22c7e` (feat)

## Deviations from Plan
- Running in parallel on the shared Wave 2 tree, this executor's commit `3b8b288` also swept in 04-04's untracked `client/history/index.tsx` (cross-staging). No content lost; that file belongs to 04-04 and is correct.

## Issues Encountered
- The Wave 2 executors hit a usage-limit reset, but both 04-06 tasks (and the failing-first test) were committed before the cutoff; the SUMMARY was written afterward by the orchestrator. Full react-native suite green (153 passed), tsc clean.

## User Setup Required
- **Firebase Storage deploy still pending** (owned by 04-02): the bucket must be enabled in the console and `firebase deploy --only storage` run before on-device photo upload works. Building these screens did not require the live bucket; upload is verified on-device in 04-07.

## Threat Surface
No new surface beyond 04-02's storage.rules: writes are restricted to `users/{own-uid}/...`; each profile screen derives uid from the auth store and never targets another user's path (D-07).

## Next Phase Readiness
- Profile editing is wired and type-clean. 04-07 device verification needs the expo-image-picker dev-client rebuild + the storage deploy to exercise the real camera/library → upload path.

## Self-Check: PASSED

---
*Phase: 04-history-polish*
*Completed: 2026-06-05*
