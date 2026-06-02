<!-- GSD:project-start source:PROJECT.md -->
## Project

**LauFit**

LauFit is a mobile fitness coaching app that connects personal trainers with their clients. The trainer programs workouts; the client executes them. It starts with one real trainer (Lau) as the first customer, architected to scale to any trainer. Two roles, no friction.

**Core Value:** The trainer can create a program and assign it to a client in under 3 minutes — if that flow is fast and reliable, trainers will adopt the tool.

### Constraints

- **Tech Stack:** React Native (Expo SDK 51+) + Firebase (Auth, Firestore, Storage, Functions) — decided upfront, non-negotiable for MVP
- **Navigation:** expo-router (file-based routing)
- **State:** react-query for server state, zustand for client state
- **Forms:** react-hook-form + zod
- **UI:** NativeWind (Tailwind for React Native) matching Obsidian Performance design system
- **Timeline:** 8–10 weeks with 1–2 devs
- **Platforms:** iOS + Android via Expo EAS
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack (2025)
### Frontend
| Library | Target Version | Purpose | Confidence |
|---------|---------------|---------|------------|
| expo | ~55.0.14 | Core framework | HIGH — SDK 55 is current stable |
| react-native | 0.83.4 | RN runtime (pinned by SDK 55) | HIGH |
| react | 19.2.0 | React runtime (pinned by SDK 55) | HIGH |
| expo-router | ~5.0.7 | File-based navigation | HIGH — bundled with SDK 54/55 |
| @tanstack/react-query | ^5.x | Server state, async data | HIGH — v5 is current stable |
| zustand | ^5.0.x | Client/UI state | HIGH — v5 is current stable |
| react-hook-form | ^7.66.x | Form management | HIGH — v7 is current stable |
| zod | ^4.4.3 | Schema validation | HIGH — v4 installed; use z.enum([...] as const), z.coerce.number(), z.url() NOT v3 API |
| nativewind | ^4.x (stable) | Tailwind styling | MEDIUM — see note below |
| react-native-reanimated | 4.2.1 | Animations (required by NativeWind) | HIGH — v4 installed (not v3); use react-native-reanimated-dnd for drag-reorder |
| react-native-gesture-handler | ~2.26.0 | Gesture handling | HIGH — bundled with SDK |
| react-native-safe-area-context | latest | Safe area insets | HIGH — standard dep |
| expo-image | latest | Performant image rendering | HIGH — replaces RN Image |
| expo-video | latest | Video playback (YouTube embed alternative) | HIGH — replaces deprecated expo-av |
| expo-secure-store | latest | Secure token persistence | HIGH — recommended over AsyncStorage for auth |
| expo-constants | latest | App config, EAS project ID | HIGH — required for push notifications |
### Backend / Firebase
| Service | Package | Version | Purpose | Confidence |
|---------|---------|---------|---------|------------|
| Firebase Auth | @react-native-firebase/auth | ^23.x | Email/password auth | HIGH |
| Firestore | @react-native-firebase/firestore | ^23.x | Primary database | HIGH |
| Storage | @react-native-firebase/storage | ^23.x | Profile photos | HIGH |
| Cloud Functions | @react-native-firebase/functions | ^23.x | Server-side logic | HIGH |
### Build and Deploy
| Tool | Version | Purpose | Confidence |
|------|---------|---------|------------|
| Expo EAS Build | latest CLI | iOS + Android binary builds | HIGH |
| Expo EAS Update | latest | OTA JavaScript updates | HIGH |
| expo-build-properties | latest | Native build config (required for iOS Firebase) | HIGH |
## Validated Choices
- **React Native (Expo SDK 51+)** — Confirmed, upgrade target to SDK 55 (current stable). SDK 55 ships with React Native 0.83.4 and React 19.2.0.
- **expo-router** — Confirmed at version ~5.0.7 (bundled with SDK 55). File-based routing is the Expo standard.
- **react-query** — Confirmed as TanStack Query v5 (the library was renamed; import path is `@tanstack/react-query`). V5 uses a single-object API for `useQuery` — minor migration surface if coming from v4.
- **zustand** — Confirmed at v5.x. The `shallow` selector pattern changed in v5 (use `useShallow` hook instead of passing `shallow` to `create`). Negligible impact for greenfield.
- **react-hook-form + zod** — Confirmed. v7.66.x is current. Combine via `@hookform/resolvers/zod` as before.
- **Firebase (Auth + Firestore + Storage + Functions)** — Confirmed. Use `@react-native-firebase/*` packages, NOT the web `firebase` JS SDK. React-native-firebase v23.x is current.
- **iOS + Android via Expo EAS** — Confirmed. EAS Build is the standard path for managed/bare Expo workflows.
## Adjustments
### 1. Target SDK 55, not SDK 51
- New Architecture is **always on and cannot be disabled** (as of SDK 55 / RN 0.82+). No opt-out exists.
- React 19 concurrent features are available by default.
- All libraries must be New Architecture compatible. The react-native-firebase packages, reanimated, gesture-handler, and NativeWind v4 are all compatible.
### 2. NativeWind: Use v4 (stable), not v5 (pre-release)
- **NativeWind v4** (stable, `nativewind@4.x`) — Uses Tailwind CSS v3, `tailwind.config.js`, stable and production-ready. Install with `npm install nativewind tailwindcss@^3.4.17`.
- **NativeWind v5** (pre-release, `nativewind@preview`) — Uses Tailwind CSS v4, `@tailwindcss/postcss`, requires React Native v0.81+ and Reanimated v4+. Still tagged `preview` as of May 2026.
### 3. Replace expo-av with expo-video
### 4. Add expo-image (replaces React Native's Image)
### 5. Add expo-secure-store for auth token persistence
### 6. Firebase: @react-native-firebase, not firebase JS SDK
### 7. Gluestack UI: skip it for this project
## Critical Gotchas
### Gotcha 1: New Architecture is mandatory in SDK 55
### Gotcha 2: expo-router v5 and SDK 56 deprecate React Navigation direct imports
### Gotcha 3: TanStack Query v5 single-object API
### Gotcha 4: Zustand v5 — `shallow` selector change
### Gotcha 5: React Native Firebase requires a development build (no Expo Go)
### Gotcha 6: EAS Build free tier build limits
- Starter plan: $19/month, includes $45 build credit, priority builds.
- Two developers running frequent iOS + Android builds will likely exhaust the free tier quickly.
### Gotcha 7: iOS useFrameworks: static breaks some libraries
### Gotcha 8: expo-av is removed in SDK 55
## Installation Reference
# Bootstrap
# Core navigation (already included in SDK 55 template)
# Firebase
# State and data
# UI and styling
# Expo utilities
# Gesture/animation (already bundled, but pin versions)
## Confidence
| Area | Level | Reasoning |
|------|-------|-----------|
| Expo SDK version (55) | HIGH | Confirmed via Context7/expo docs — SDK 55 current stable with RN 0.83 |
| expo-router version | HIGH | Confirmed ~5.0.7 bundled with SDK 55 |
| NativeWind v4 vs v5 | MEDIUM | V5 is pre-release; v4 is stable. Recommendation is conservative but evidence-based |
| TanStack Query v5 | HIGH | Confirmed via Context7/tanstack docs — v5 is current with v5.90.x releases |
| react-native-firebase | HIGH | Confirmed via Context7/invertase docs — proper choice over firebase JS SDK for RN |
| New Architecture mandatory | HIGH | Confirmed via Expo docs — SDK 55 / RN 0.83 cannot disable New Arch |
| EAS Build pricing | MEDIUM | Free tier limit count not published precisely in docs; structure confirmed |
| expo-av deprecation | HIGH | Confirmed deprecated SDK 53, removed SDK 54, replaced by expo-video |
## Sources
- Expo SDK 55 docs: https://docs.expo.dev (Context7: `/websites/expo_dev`, `/llmstxt/expo_dev_llms_txt`)
- NativeWind v4 docs: https://www.nativewind.dev/docs (Context7: `/websites/nativewind_dev`)
- NativeWind v5 docs: https://www.nativewind.dev/v5 (Context7: `/websites/nativewind_dev_v5`)
- TanStack Query v5: https://tanstack.com/query/v5 (Context7: `/tanstack/query`)
- React Native Firebase: https://github.com/invertase/react-native-firebase (Context7: `/invertase/react-native-firebase`)
- Zustand v5: https://github.com/pmndrs/zustand (Context7: `/pmndrs/zustand`)
- EAS Billing: https://docs.expo.dev/billing/plans
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
