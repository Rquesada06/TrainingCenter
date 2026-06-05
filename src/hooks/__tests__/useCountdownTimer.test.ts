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
// Mocks — must be before all imports (jest hoists these)
// ─────────────────────────────────────────────────────────────────────────────

const mockPlay = jest.fn();
const mockRemove = jest.fn();
const mockCreateAudioPlayer = jest.fn(() => ({ play: mockPlay, remove: mockRemove }));

jest.mock('expo-audio', () => ({
  createAudioPlayer: mockCreateAudioPlayer,
}));

const mockNotificationAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-haptics', () => ({
  notificationAsync: mockNotificationAsync,
  NotificationFeedbackType: { Success: 'success' },
}));

const mockActivateKeepAwakeAsync = jest.fn().mockResolvedValue(undefined);
const mockDeactivateKeepAwake = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: mockActivateKeepAwakeAsync,
  deactivateKeepAwake: mockDeactivateKeepAwake,
}));

// AppState mock — we capture the listener so we can trigger it
let appStateListener: ((state: string) => void) | null = null;
const mockAddEventListener = jest.fn((_event: string, handler: (state: string) => void) => {
  appStateListener = handler;
  return { remove: jest.fn() };
});
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: mockAddEventListener,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ─────────────────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useCountdownTimer } from '../useCountdownTimer';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
  mockPlay.mockClear();
  mockRemove.mockClear();
  mockCreateAudioPlayer.mockClear();
  mockNotificationAsync.mockClear();
  mockActivateKeepAwakeAsync.mockClear();
  mockDeactivateKeepAwake.mockClear();
  appStateListener = null;
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

    // Timer should NOT have expired yet (remaining ≈ 16s before, now ≈ 16s)
    // Advance 5 more seconds (past original expiry) — should still be running
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onExpire).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(true);
  });
});

describe('useCountdownTimer — keep-awake lifecycle', () => {
  it('activates keep-awake when timer starts, deactivates on expiry', async () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.start(2);
    });

    expect(mockActivateKeepAwakeAsync).toHaveBeenCalledWith('countdown-timer');

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(mockDeactivateKeepAwake).toHaveBeenCalledWith('countdown-timer');
  });
});

describe('useCountdownTimer — foreground recompute (AppState)', () => {
  it('recomputes now from Date.now() when AppState fires "active"', () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.start(30);
    });

    // Simulate app returning to foreground at a specific time
    act(() => {
      jest.setSystemTime(15_000); // 15s have elapsed
      if (appStateListener) {
        appStateListener('active');
      }
    });

    // remainingMs should reflect the advanced time (endsAt=30000, now=15000)
    expect(result.current.remainingMs).toBeLessThanOrEqual(15_500);
    expect(result.current.remainingMs).toBeGreaterThan(14_000);
  });
});
