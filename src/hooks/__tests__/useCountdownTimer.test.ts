/**
 * useCountdownTimer unit tests — Phase 05 Plan 05 (TIMR-03/TIMR-04)
 *
 * Verifies the fire-once alarm guard, skip suppression, add15 extension,
 * and the foreground-recompute AppState path.
 *
 * All three native modules (expo-audio, expo-haptics, expo-keep-awake) and
 * AppState are mocked before any imports (mirror jest.mock-before-imports
 * pattern from sessionStore.test.ts).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must be before all imports (jest hoists these).
// Factory functions cannot reference outer-scope vars (they run before the var
// declarations). We use jest.fn() inline and retrieve the mocks via
// jest.mocked() / module reference after imports.
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn().mockResolvedValue(undefined),
}));

// AppState mock — we capture the listener so tests can trigger 'active' events
let appStateListener: ((state: string) => void) | null = null;
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((_event: string, handler: (state: string) => void) => {
      appStateListener = handler;
      return { remove: jest.fn() };
    }),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ─────────────────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import * as ExpoAudio from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { useCountdownTimer } from '../useCountdownTimer';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
  jest.clearAllMocks();
  appStateListener = null;

  // Reset the createAudioPlayer mock to return a fresh player each call
  (ExpoAudio.createAudioPlayer as jest.Mock).mockImplementation(() => ({
    play: jest.fn(),
    remove: jest.fn(),
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useCountdownTimer — fire-once alarm guard', () => {
  it('fires onExpire callback exactly ONCE when timer reaches zero', () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    // Start a 5-second timer
    act(() => {
      result.current.start(5);
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.remainingMs).toBeGreaterThan(0);

    // Advance past expiry
    act(() => {
      jest.advanceTimersByTime(5500);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.isRunning).toBe(false);
  });

  it('alarm fires exactly once — advancing further does NOT re-fire', () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    act(() => {
      result.current.start(3);
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Advance another 5 seconds — should NOT fire again
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('plays alarm audio via createAudioPlayer on expiry', () => {
    const { result } = renderHook(() => useCountdownTimer());
    const mockPlayer = { play: jest.fn(), remove: jest.fn() };
    (ExpoAudio.createAudioPlayer as jest.Mock).mockReturnValue(mockPlayer);

    act(() => {
      result.current.start(2);
    });

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(ExpoAudio.createAudioPlayer).toHaveBeenCalled();
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  it('fires haptic notification on expiry', () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.start(2);
    });

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});

describe('useCountdownTimer — skip suppresses alarm', () => {
  it('skip() before expiry fires NO onExpire callback', () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    act(() => {
      result.current.start(10);
    });

    // Skip with 5 seconds remaining
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      result.current.skip();
    });

    // Advance past where it would have expired
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onExpire).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(false);
  });

  it('skip() fires no alarm audio', () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.start(10);
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      result.current.skip();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(ExpoAudio.createAudioPlayer).not.toHaveBeenCalled();
  });
});

describe('useCountdownTimer — add15 extends endsAt', () => {
  it('add15() extends the running timer by 15 seconds', () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useCountdownTimer(onExpire));

    // Start a 5-second timer
    act(() => {
      result.current.start(5);
    });

    // Advance 4 seconds — still running
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(result.current.isRunning).toBe(true);

    // Extend by 15 seconds
    act(() => {
      result.current.add15();
    });

    // Advance 5 more seconds (past original expiry) — should still be running
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onExpire).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(true);
  });
});

describe('useCountdownTimer — keep-awake lifecycle', () => {
  it('activates keep-awake when timer starts, deactivates on expiry', () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.start(2);
    });

    expect(KeepAwake.activateKeepAwakeAsync).toHaveBeenCalledWith('countdown-timer');

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(KeepAwake.deactivateKeepAwake).toHaveBeenCalledWith('countdown-timer');
  });
});

describe('useCountdownTimer — foreground recompute (AppState)', () => {
  it('recomputes now from Date.now() when AppState fires "active"', () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.start(30);
    });

    // Simulate app returning to foreground after 15s elapsed
    act(() => {
      jest.setSystemTime(15_000); // 15s have elapsed
      if (appStateListener) {
        appStateListener('active');
      }
    });

    // endsAt = 30000, now recomputed to 15000 → remaining = 15000
    expect(result.current.remainingMs).toBeLessThanOrEqual(15_500);
    expect(result.current.remainingMs).toBeGreaterThan(14_000);
  });
});
