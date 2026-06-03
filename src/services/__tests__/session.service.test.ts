/**
 * session.service tests — Phase 03 Plan 02 (WORK-06/07/09)
 *
 * Covers:
 *   - findMyActiveAssignment: client-scoped query (clientId + status, NO trainerId
 *     filter), querySnap.empty → null, present → { ...data, id }
 *   - findTodaySession: duplicate-guard query (clientId + date), empty → null,
 *     present → { ...data, id }  (WORK-09)
 *   - createSession: .add(stripUndefinedDeep(data)) → returns ref id (WORK-06/07)
 *
 * Threat T-03-04: queries filter clientId == self; no other-client reads.
 *
 * Mock strategy mirrors exercise.service.test.ts: jest.mock() is hoisted above
 * imports, all mock fns created inside the factory (avoids TDZ), exposed via
 * __mocks and retrieved with jest.requireMock(). The chainable query mock
 * returns the same chain object from where()/limit() so .where().where().limit()
 * resolves to .get().
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/firestore', () => {
  const _mockGet = jest.fn();
  const _mockAdd = jest.fn();
  // Chainable query node: where() and limit() return the same chain so that
  // .where().where().limit().get() resolves correctly.
  const _chain: { where: jest.Mock; limit: jest.Mock; get: jest.Mock } = {
    where: jest.fn(() => _chain),
    limit: jest.fn(() => _chain),
    get: _mockGet,
  };
  const _mockWhere = _chain.where;
  const _mockLimit = _chain.limit;
  const _mockCollection = jest.fn(() => ({
    where: _mockWhere,
    limit: _mockLimit,
    add: _mockAdd,
  }));
  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));

  (firestoreFn as any).__mocks = {
    get: _mockGet,
    add: _mockAdd,
    where: _mockWhere,
    limit: _mockLimit,
    collection: _mockCollection,
    chain: _chain,
  };

  return firestoreFn;
});

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import {
  findMyActiveAssignment,
  findTodaySession,
  createSession,
} from '../session.service';
import type { Session } from '@/types/session';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const firestoreMock = jest.requireMock('@react-native-firebase/firestore');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocks = (firestoreMock as any).__mocks as {
  get: jest.Mock;
  add: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
  collection: jest.Mock;
  chain: { where: jest.Mock; limit: jest.Mock; get: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  // Re-wire the chain after clearAllMocks resets call records.
  mocks.collection.mockReturnValue({
    where: mocks.where,
    limit: mocks.limit,
    add: mocks.add,
  });
  mocks.where.mockReturnValue(mocks.chain);
  mocks.limit.mockReturnValue(mocks.chain);
});

// ────────────────────────────────────────────────────────────────────────────
// findMyActiveAssignment — client-scoped read (no trainerId filter)
// ────────────────────────────────────────────────────────────────────────────

describe('findMyActiveAssignment', () => {
  it('returns null when querySnap.empty is true', async () => {
    mocks.get.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await findMyActiveAssignment('client-1');

    expect(result).toBeNull();
  });

  it('filters by clientId + status but NOT trainerId, and returns { ...data, id }', async () => {
    const data = {
      clientId: 'client-1',
      trainerId: 'trainer-9',
      status: 'active',
      programId: 'prog-1',
    };
    mocks.get.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'assignment-1', data: () => data }],
    });

    const result = await findMyActiveAssignment('client-1');

    expect(mocks.where).toHaveBeenCalledWith('clientId', '==', 'client-1');
    expect(mocks.where).toHaveBeenCalledWith('status', '==', 'active');
    // CRITICAL: no trainerId filter — the client reads their OWN assignment.
    expect(mocks.where).not.toHaveBeenCalledWith(
      'trainerId',
      '==',
      expect.anything()
    );
    expect(result).toEqual({ ...data, id: 'assignment-1' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// findTodaySession — duplicate guard (WORK-09)
// ────────────────────────────────────────────────────────────────────────────

describe('findTodaySession', () => {
  it('returns null when no session exists for (clientId, today)', async () => {
    mocks.get.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await findTodaySession('client-1', '2026-06-03');

    expect(result).toBeNull();
  });

  it('filters by clientId + date and returns the existing session doc', async () => {
    const data = {
      clientId: 'client-1',
      date: '2026-06-03',
      weekIndex: 0,
      dayIndex: 1,
    };
    mocks.get.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'session-1', data: () => data }],
    });

    const result = await findTodaySession('client-1', '2026-06-03');

    expect(mocks.where).toHaveBeenCalledWith('clientId', '==', 'client-1');
    expect(mocks.where).toHaveBeenCalledWith('date', '==', '2026-06-03');
    expect(result).toEqual({ ...data, id: 'session-1' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// createSession — finish write (WORK-06/07)
// ────────────────────────────────────────────────────────────────────────────

describe('createSession', () => {
  it('writes through stripUndefinedDeep (no undefined values) and returns the new ref id', async () => {
    mocks.add.mockResolvedValueOnce({ id: 'new-session-id' });

    const data: Omit<Session, 'id'> = {
      clientId: 'client-1',
      trainerId: 'trainer-9',
      assignmentId: 'assignment-1',
      date: '2026-06-03',
      weekIndex: 0,
      dayIndex: 1,
      mode: 'gym',
      completedExerciseIds: ['e1', 'e2'],
      totalExercises: 3,
      startedAt: '2026-06-03T10:00:00.000Z',
      completedAt: '2026-06-03T10:45:00.000Z',
      routineName: null,
    };

    const result = await createSession(data);

    expect(mocks.add).toHaveBeenCalledTimes(1);
    const written = mocks.add.mock.calls[0][0];
    // stripUndefinedDeep: no key holds an undefined value.
    for (const key of Object.keys(written)) {
      expect(written[key]).not.toBeUndefined();
    }
    expect(written.clientId).toBe('client-1');
    expect(result).toBe('new-session-id');
  });

  it('strips undefined keys before writing (stripUndefinedDeep applied)', async () => {
    mocks.add.mockResolvedValueOnce({ id: 'sid' });

    const dirty = {
      clientId: 'client-1',
      routineName: undefined,
    } as unknown as Omit<Session, 'id'>;

    await createSession(dirty);

    const written = mocks.add.mock.calls[0][0];
    expect('routineName' in written).toBe(false);
    expect(written.clientId).toBe('client-1');
  });
});
