/**
 * Unit tests for timer — Phase 05 Plan 02 (TIMR-03)
 *
 * Pure function tests — no mocks required.
 * Tests cover:
 *   - remainingMs: computes from absolute endsAt (D-06 / never accumulate ticks)
 *   - remainingMs: clamps negative to 0
 *   - addFifteen: extends endsAt by 15_000 ms
 *   - isExpired: true at exactly 0 and when negative
 *   - formatMmSs: formats milliseconds to MM:SS string
 */

import { remainingMs, addFifteen, isExpired, formatMmSs } from '../timer';

describe('remainingMs', () => {
  it('returns the difference when endsAt > now', () => {
    const now = 1_000_000;
    const endsAt = now + 5_000;
    expect(remainingMs(endsAt, now)).toBe(5_000);
  });

  it('clamps negative difference to 0 (timer expired)', () => {
    const now = 1_000_000;
    const endsAt = now - 3_000; // already in the past
    expect(remainingMs(endsAt, now)).toBe(0);
  });

  it('returns 0 when endsAt === now (expired at boundary)', () => {
    const now = 1_000_000;
    expect(remainingMs(now, now)).toBe(0);
  });

  it('returns exact ms for fractional case', () => {
    expect(remainingMs(60_000, 0)).toBe(60_000);
  });
});

describe('addFifteen', () => {
  it('extends endsAt by exactly 15_000 ms', () => {
    const endsAt = 50_000;
    expect(addFifteen(endsAt)).toBe(65_000);
  });

  it('can extend a past endsAt (resume timer even if expired)', () => {
    // If the user taps +15 on an expired timer, it extends from the old endsAt
    expect(addFifteen(0)).toBe(15_000);
  });
});

describe('isExpired', () => {
  it('returns true when now > endsAt', () => {
    expect(isExpired(1_000, 2_000)).toBe(true);
  });

  it('returns true at exactly endsAt === now (expired at boundary)', () => {
    expect(isExpired(1_000, 1_000)).toBe(true);
  });

  it('returns false when now < endsAt (still time remaining)', () => {
    expect(isExpired(2_000, 1_000)).toBe(false);
  });
});

describe('formatMmSs', () => {
  it('formats 90_000 ms as 1:30', () => {
    expect(formatMmSs(90_000)).toBe('1:30');
  });

  it('formats 0 ms as 0:00', () => {
    expect(formatMmSs(0)).toBe('0:00');
  });

  it('formats 60_000 ms (1 minute exactly) as 1:00', () => {
    expect(formatMmSs(60_000)).toBe('1:00');
  });

  it('formats 5_500 ms (5.5 s) as 0:05 (floor seconds)', () => {
    expect(formatMmSs(5_500)).toBe('0:05');
  });

  it('formats 3_600_000 ms (60 min) as 60:00', () => {
    expect(formatMmSs(3_600_000)).toBe('60:00');
  });
});
