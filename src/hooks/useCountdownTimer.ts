/**
 * useCountdownTimer — Phase 05 Plan 05 (TIMR-01/TIMR-02/TIMR-03/TIMR-04)
 *
 * Single timer hook owning endsAt, a 250ms tick, AppState foreground recompute,
 * expo-keep-awake (screen-on while running), and a fire-once alarm+haptic at 0.
 *
 * Design decisions:
 *   - Derives `remainingMs` from `endsAt - now` only — never accumulated ticks (D-06)
 *   - `firedRef` guard ensures the alarm fires exactly once per start() call
 *   - `skip()` sets firedRef so NO alarm fires on dismiss
 *   - `add15()` extends the absolute `endsAt` by 15s (+15s button)
 *   - Two consumers (rest auto-start, work manual Start) differ only in who
 *     calls `start(seconds)` — this hook owns no consumer-specific logic
 *
 * Native modules isolated here for swappability:
 *   - expo-keep-awake: activateKeepAwakeAsync / deactivateKeepAwake
 *   - expo-audio:      createAudioPlayer (play the bundled alarm.mp3)
 *   - expo-haptics:    notificationAsync(Success) at expiry
 *
 * No React, no Firebase outside of this file. Pure timer math composed from
 * src/lib/timer.ts (remainingMs / addFifteen / isExpired — Wave-0 tested).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { addFifteen } from '@/lib/timer';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const KEEP_AWAKE_TAG = 'countdown-timer';
const TICK_INTERVAL_MS = 250;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALARM_ASSET = require('../../assets/audio/alarm.wav') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BEEP_ASSET = require('../../assets/audio/beep.wav') as number;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface CountdownTimerState {
  /** Remaining milliseconds (clamped ≥ 0). Derived from `endsAt - now`. */
  remainingMs: number;
  /** True while the timer is counting down (endsAt is set). */
  isRunning: boolean;
  /** Start a countdown from `sec` seconds from now. Resets the fire guard. */
  start: (sec: number) => void;
  /** Extend the current endsAt by 15 seconds. No-op if not running. */
  add15: () => void;
  /** Dismiss the timer immediately — no alarm fires. */
  skip: () => void;
  /** Play a short confirmation beep (e.g. when a rest auto-starts). */
  beep: () => void;
}

/**
 * Single countdown timer hook for rest (auto-start) and work (manual Start) timers.
 *
 * @param onExpire Optional callback invoked exactly once when the timer reaches 0.
 *                 Not called when the timer is dismissed via `skip()`.
 */
export function useCountdownTimer(onExpire?: () => void): CountdownTimerState {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // Fire-once guard — set true on alarm fire or skip
  const firedRef = useRef<boolean>(false);
  // Stable ref to onExpire so the effect doesn't re-run when callback identity changes
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // ── 250ms tick (only while active) + keep-awake lifecycle ─────────────────
  useEffect(() => {
    if (endsAt == null) return;

    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

    const id = setInterval(() => {
      setNow(Date.now());
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(id);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [endsAt]);

  // ── AppState foreground recompute — never trust accumulated ticks (D-06) ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(Date.now());
      }
    });
    return () => sub.remove();
  }, []);

  // ── Derived remaining (absolute, never negative) ──────────────────────────
  const remainingMs =
    endsAt == null ? 0 : Math.max(0, endsAt - now);

  // ── Fire-once alarm + haptic at ≤ 0 ──────────────────────────────────────
  useEffect(() => {
    if (endsAt != null && remainingMs <= 0 && !firedRef.current) {
      firedRef.current = true;

      // Play alarm sound (expo-audio createAudioPlayer API — verified post-install)
      try {
        const player = createAudioPlayer(ALARM_ASSET);
        player.play();
        // Release after a short delay so the sound finishes playing
        setTimeout(() => player.remove(), 3000);
      } catch {
        // Non-fatal: alarm audio failure should not block finalize path
      }

      // Vibration — a strong, unmistakable alarm pattern via RN Vibration
      // (the expo-haptics "Success" notification alone was too subtle to notice).
      Vibration.vibrate([0, 500, 250, 500, 250, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // User callback
      onExpireRef.current?.();

      // Auto-dismiss (stop the tick + keep-awake)
      setEndsAt(null);
    }
  }, [remainingMs, endsAt]);

  // ── Public API ────────────────────────────────────────────────────────────

  const start = useCallback((sec: number) => {
    firedRef.current = false;
    const newEndsAt = Date.now() + sec * 1_000;
    setEndsAt(newEndsAt);
    setNow(Date.now());
  }, []);

  const add15cb = useCallback(() => {
    setEndsAt((e) => (e == null ? e : addFifteen(e)));
  }, []);

  const skip = useCallback(() => {
    // Set guard first so the expiry effect cannot fire between state updates
    firedRef.current = true;
    setEndsAt(null);
  }, []);

  const beep = useCallback(() => {
    try {
      const player = createAudioPlayer(BEEP_ASSET);
      player.play();
      setTimeout(() => player.remove(), 1000);
    } catch {
      // Non-fatal: a missed confirmation beep must never block the timer.
    }
  }, []);

  return {
    remainingMs,
    isRunning: endsAt != null,
    start,
    add15: add15cb,
    skip,
    beep,
  };
}
