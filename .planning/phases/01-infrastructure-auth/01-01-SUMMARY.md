---
phase: 01-infrastructure-auth
plan: 01
subsystem: infra
tags: [expo, react-native, firebase, nativewind, typescript, eas, jest, zustand, react-query]

# Dependency graph
requires: []
provides:
  - Expo SDK 55 project with src/app/ layout (expo-router v5 file-based routing)
  - "@react-native-firebase v24.0.0 (app, auth, firestore, functions, storage)"
  - app.config.js with Firebase plugins, useFrameworks: static, env-var googleServicesFile
  - eas.json with development/development-simulator/preview/production build profiles
  - NativeWind v4 + tailwindcss ^3.4.19 (v3 pinned) + Obsidian Performance theme tokens
  - tsconfig.json @/* -> ./src/* path alias with baseUrl '.'
  - src/types/user.ts - UserRole, User, CreateClientAccountInput, CreateClientAccountResult
  - jest.config.js with jest-expo preset and @/ -> src/ moduleNameMapper
affects:
  - 01-02 (imports user types from src/types/user.ts)
  - 01-03 (imports user types, uses authStore shape)
  - 01-04 (imports user types, uses Firebase config)
  - all subsequent phases (depend on @/* alias, NativeWind theme, Firebase setup)

# Tech tracking
tech-stack:
  added:
    - expo ~55.0.26 (SDK 55, RN 0.83.6, React 19.2.0)
    - expo-router ~55.0.16 (file-based routing, Stack.Protected)
    - "@react-native-firebase/app ^24.0.0"
    - "@react-native-firebase/auth ^24.0.0"
    - "@react-native-firebase/firestore ^24.0.0"
    - "@react-native-firebase/functions ^24.0.0"
    - "@react-native-firebase/storage ^24.0.0"
    - expo-build-properties ~55.0.14 (iOS useFrameworks: static)
    - expo-dev-client ~55.0.35
    - expo-secure-store ~55.0.14
    - zustand ^5.0.14
    - react-hook-form ^7.76.1
    - zod ^4.4.3
    - "@hookform/resolvers ^5.4.0"
    - "@tanstack/react-query ^5.100.14"
    - nativewind ^4.2.4
    - tailwindcss ^3.4.19 (devDependency, v3 pinned for NativeWind v4 compatibility)
    - jest-expo ~55.0.18
    - "@testing-library/react-native ^13.3.3"
  patterns:
    - Dynamic Expo config via app.config.js (APP_VARIANT env var for dev/prod switching)
    - EAS secret file env vars for Firebase config (never committed to git)
    - NativeWind v4 + metro.config.js withNativeWind wrapper
    - Obsidian Performance design theme (#0E0E0E base, #00FF66 accent)
    - jest-expo preset with @/* moduleNameMapper matching tsconfig paths

key-files:
  created:
    - app.config.js
    - eas.json
    - firebase.json
    - babel.config.js
    - metro.config.js
    - tailwind.config.js
    - global.css
    - tsconfig.json
    - jest.config.js
    - src/types/user.ts
    - src/types/css-modules.d.ts
    - nativewind-env.d.ts
  modified:
    - package.json (all dependencies added)
    - .gitignore (Firebase config files added)

key-decisions:
  - "react-native-firebase v24.0.0 chosen over v22 — latest stable compatible with SDK 55 / RN 0.83"
  - "tailwindcss pinned to ^3.4.19 (v3) — NativeWind v4 requires Tailwind v3, v4.x is incompatible"
  - "react-native-reanimated 4.2.1 kept from scaffold — NativeWind v4.2.4 has no reanimated peer dep"
  - "app.json removed — app.config.js is the sole config source to avoid expo-doctor conflict"
  - "@testing-library/react-native installed with --legacy-peer-deps due to react-test-renderer minor version delta"

patterns-established:
  - "Dynamic config pattern: app.config.js IS_DEV = APP_VARIANT === development"
  - "Firebase secrets pattern: gitignored files, EAS secret file env vars in app.config.js"
  - "NativeWind pattern: metro.config.js withNativeWind + babel nativewind/babel preset + global.css"
  - "TypeScript alias pattern: @/* -> ./src/* in tsconfig + jest moduleNameMapper"
  - "Interface-first types: user.ts defines contracts, all other plans import"

requirements-completed: [AUTH-01, AUTH-03, AUTH-05]

# Metrics
duration: 8min
completed: 2026-05-28
---

# Phase 01 Plan 01: Infrastructure Scaffold Summary

**Expo SDK 55 project scaffolded with @react-native-firebase v24, NativeWind v4 + Tailwind v3 pinned, EAS dev client profile, @/* TypeScript alias, and shared user type contracts ready for Plans 02-04.**

## Performance

- **Duration:** 8 minutes
- **Started:** 2026-05-28T14:47:58Z
- **Completed:** 2026-05-28T14:55:50Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Scaffolded Expo SDK 55 project with `src/app/` layout using `create-expo-app --template default@sdk-55`
- Installed all Phase 1 dependencies: @react-native-firebase v24.0.0 (5 packages), expo utilities (build-properties, dev-client, secure-store, splash-screen), zustand v5, react-hook-form v7, zod v4, @hookform/resolvers, @tanstack/react-query v5, nativewind v4.2.4 with tailwindcss v3 pinned
- Configured `app.config.js` with Firebase plugins, `useFrameworks: static` (iOS requirement), and EAS secret file env var pattern for `googleServicesFile`
- Created `eas.json` with development (APK, dev client), development-simulator (iOS simulator), preview, and production profiles
- Configured NativeWind v4: `tailwind.config.js` with Obsidian Performance theme tokens, `metro.config.js` withNativeWind wrapper, `babel.config.js` with nativewind/babel preset, `global.css` with three @tailwind directives
- Set `tsconfig.json` `baseUrl: '.'` and `@/*` -> `./src/*` path alias
- Created `src/types/user.ts` with UserRole, User, CreateClientAccountInput, CreateClientAccountResult (interface-first contracts for all subsequent plans)
- Configured `jest.config.js` with jest-expo preset and @/ moduleNameMapper
- Added `google-services.json` and `GoogleService-Info.plist` to `.gitignore` (T-01-01 mitigation)
- expo-doctor: 19/19 checks passed; tsc --noEmit: clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold SDK 55 project and install pinned dependencies** - `9655c5c` (chore)
2. **Task 2: Configure build, styling, Firebase plugins, and TypeScript paths** - `4ebc59f` (feat)
3. **Task 3: Define shared user type contracts and Jest test infrastructure** - `11b600b` (feat)

## Files Created/Modified

- `app.config.js` - Dynamic Expo config with Firebase plugins, useFrameworks: static, EAS env-var googleServicesFile
- `eas.json` - EAS build profiles: development (APK, dev client), development-simulator, preview, production
- `firebase.json` - Firebase deploy target wiring (firestore.rules, firestore.indexes.json, functions/)
- `tsconfig.json` - @/* -> ./src/* path alias with baseUrl '.'
- `babel.config.js` - babel-preset-expo with jsxImportSource: nativewind + nativewind/babel preset
- `metro.config.js` - getDefaultConfig wrapped with withNativeWind pointing at global.css
- `tailwind.config.js` - NativeWind v4 preset + Obsidian Performance design tokens (#00FF66 accent)
- `global.css` - Three @tailwind directives (base, components, utilities)
- `nativewind-env.d.ts` - Auto-generated by NativeWind during expo-doctor run
- `jest.config.js` - jest-expo preset with @/ -> src/ moduleNameMapper and RN Firebase transformIgnorePatterns
- `src/types/user.ts` - UserRole, User, CreateClientAccountInput, CreateClientAccountResult interfaces
- `src/types/css-modules.d.ts` - Type declaration for scaffold .module.css files (web-only components)
- `package.json` - All Phase 1 dependencies at pinned versions
- `.gitignore` - Added google-services.json and GoogleService-Info.plist entries

## Decisions Made

- **react-native-firebase v24.0.0** chosen over v22.x (RESEARCH recommended ^22.x but latest v24 is current stable and confirmed compatible with RN 0.83 / New Architecture).
- **tailwindcss ^3.4.19** pinned in devDependencies — npm resolved to 3.4.19 from the `^3.4.17` pin. NativeWind v4 requires Tailwind v3 (v4.x silently breaks styles).
- **react-native-reanimated 4.2.1** kept from scaffold — NativeWind v4.2.4 has no `react-native-reanimated` peer dependency (verified via package.json inspect). RESEARCH note about `~3.18.0` was conservative; v4.2.1 works.
- **app.json removed entirely** — expo-doctor flagged conflict between static app.json and app.config.js. Removing app.json makes app.config.js the sole config source.
- **@testing-library/react-native installed with `--legacy-peer-deps`** — v13 wants `react-test-renderer@^19.2.6` but react is `19.2.0`; react-test-renderer 19.2.0 is already installed by jest-expo and works at runtime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added CSS module type declaration for scaffold web components**
- **Found during:** Task 2 (tsconfig.json creation)
- **Issue:** `src/components/animated-icon.web.tsx` (scaffold file) imports `./animated-icon.module.css` without a type declaration — `npx tsc --noEmit` failed with TS2307
- **Fix:** Created `src/types/css-modules.d.ts` with `declare module '*.module.css'` type declaration
- **Files modified:** `src/types/css-modules.d.ts` (created)
- **Verification:** `npx tsc --noEmit` passed cleanly
- **Committed in:** `4ebc59f` (Task 2 commit)

**2. [Rule 3 - Blocking] Removed conflicting static app.json**
- **Found during:** Task 2 (expo-doctor verification)
- **Issue:** expo-doctor check failed: "you have an app.json file in your project, but your app.config.js is not using the values from it"
- **Fix:** Removed `app.json` — `app.config.js` is the complete config source per plan design
- **Files modified:** `app.json` (deleted)
- **Verification:** expo-doctor 19/19 checks passed
- **Committed in:** `4ebc59f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** Both fixes were necessary for TypeScript compilation and expo-doctor to pass. No scope creep.

## Issues Encountered

- **jest-expo version conflict:** Running `npm install --save-dev jest-expo` tried to install v56 which requires `react@^19.2.3` (our version is `19.2.0`). Resolved by using `npx expo install jest-expo` which selected the SDK 55-compatible version (~55.0.18).
- **@testing-library/react-native peer conflict:** v13 wants `react-test-renderer@^19.2.6` while `19.2.0` is installed. Used `--legacy-peer-deps` since jest-expo already installs `react-test-renderer@19.2.0` which works at runtime.

## User Setup Required

Before the first EAS build, the following manual steps are required:

1. **Create Firebase project** — Firebase Console: enable Email/Password Authentication, create Firestore database in production mode, register Android app (com.laufit.dev) and iOS app (com.laufit.dev), download config files.

2. **Upload EAS secret files:**
```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
```

3. **Trigger first EAS development build:**
```bash
eas build --profile development --platform android
# or for iOS simulator:
eas build --profile development-simulator --platform ios
```

See `01-PLAN.md` `user_setup` section for full details.

## Next Phase Readiness

- **Plan 02** (authStore + auth listener): Ready. `src/types/user.ts` exports `UserRole` and `User` for import. `src/stores/` and `src/firebase/` directories to be created in Plan 02.
- **Plan 03** (sign-in screen + navigation): Ready. NativeWind theme tokens and @/* alias are wired.
- **Plan 04** (Firestore rules + Cloud Function): Ready. `firebase.json` wires rules/indexes/functions deploy targets. `CreateClientAccountInput`/`CreateClientAccountResult` contracts defined.

No blockers for Plans 02-04. EAS build requires Firebase project + secret files (user setup required, not a code blocker).

---
*Phase: 01-infrastructure-auth*
*Completed: 2026-05-28*

## Self-Check: PASSED

- All 12 created files verified present on disk
- All 3 task commits verified in git log (9655c5c, 4ebc59f, 11b600b)
- SUMMARY.md created at `.planning/phases/01-infrastructure-auth/01-01-SUMMARY.md`
- expo-doctor: 19/19 checks passed
- tsc --noEmit: clean
