# Plan 03-05 Summary — On-device UAT

**Status:** Complete
**Requirements:** WORK-01..09 (end-to-end on-device verification)

## Automated gate
- `npx jest --selectProjects react-native` — **green** (109 passing, 1 skipped firestore-rules suite = no-JRE env soft-blocker).
- `npx tsc --noEmit` — exit 0.
- iOS bundle export — clean.

## On-device UAT — PASSED (user approved 2026-06-04)
Verified on a rebuilt Android dev client against a test client with a program assigned:
1. **Home states (WORK-01/02)** — correct state on open; today's-workout derivation works.
2. **Exercise detail + video (WORK-03)** — inline media; YouTube playback working (see fixes).
3. **Completion checkboxes (WORK-04)** — mark/undo with strikethrough.
4. **Gym/home toggle (WORK-05)** — variant swap + mode tag; last mode remembered across restart.
5. **Crash-safe resume (WORK-08)** — force-quit mid-session → Resume/Start-over restores checks + mode.
6. **Finish → celebration → Firestore session + duplicate guard (WORK-06/07/09)** — completed a full workout; session written; done state + read-only re-open; no second session same day.

## Fixes applied during UAT (committed)
The native rebuild + device testing surfaced issues, all fixed:
- **YouTube video playback** — `expo-video` can't play YouTube; the trainer intent is always YouTube. Added `react-native-webview` + `react-native-youtube-iframe` + a `parseYouTubeId` helper (+ tests); `ExerciseRow` routes YouTube→embed, direct file→expo-video, else image. (commits `82db799`, `e6f005e`, `a65c39d`)
- **Phantom "workout" tab (box-with-x)** — the `client/workout/` route leaked into the client tab bar; hidden with `href: null`. (`8d88519`)
- **Guided flow** — completing an exercise collapses it and auto-opens the next unfinished one. (`0639323`, `3311169`)
- **async-storage** — promoted from transitive to a declared dependency. (`94fef68`)

## Deferred / notes
- expo-video, react-native-webview are native modules → a dev-client rebuild is required (done in UAT). react-native-youtube-iframe is JS-only.
- An exercise with both a video and an image shows the video (D-07 video-precedence) — by design.
- firestore-rules emulator tests still need a JRE (carried env soft-blocker from Phase 1/2).

## Self-Check: PASSED
