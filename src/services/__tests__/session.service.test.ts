/**
 * session.service tests — Phase 03 Plan 02 (WORK-06/07/09) + Phase 04 (HIST-01/03)
 *
 * Covers:
 *   - findMyActiveAssignment: client-scoped query (clientId + status, NO trainerId
 *     filter), querySnap.empty → null, present → { ...data, id }
 *   - findTodaySession: duplicate-guard query (clientId + date), empty → null,
 *     present → { ...data, id }  (WORK-09)
 *   - createSession: .add(stripUndefinedDeep(data)) → returns ref id (WORK-06/07)
 *   - fetchSessionPage: paged query (clientId, orderBy date desc, limit 20),
 *     cursor-less first page, startAfter(cursor) on subsequent pages (HIST-01/03)
 *   - fetchSessionsForAssignment: two-where query (clientId + assignmentId),
 *     snap.empty → [], present → array (HIST-04 adherence reads)
 *
 * Threat T-03-04: queries filter clientId == self; no other-client reads.
 *
 * Mock strategy: jest.mock() is hoisted above imports, all mock fns created inside
 * the factory (avoids TDZ). The chainable query mock (`_chain`) returns itself from
 * where()/limit()/orderBy()/startAfter() so any call order resolves to .get().
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/firestore', () => {
  const _mockGet = jest.fn();
  const _mockAdd = jest.fn();

  // Chainable query node — every query method returns the same chain so that
  // any combination of .where().where().orderBy().limit().startAfter().get()
  // resolves to the single _mockGet spy.
  const _chain: {
    where: jest.Mock;
    limit: jest.Mock;
    orderBy: jest.Mock;
    startAfter: jest.Mock;
    get: jest.Mock;
  } = {
    where: jest.fn(() => _chain),
    limit: jest.fn(() => _chain),
    orderBy: jest.fn(() => _chain),
    startAfter: jest.fn(() => _chain),
    get: _mockGet,
  };

  const _mockCollection = jest.fn(() => ({
    where: _chain.where,
    limit: _chain.limit,
    orderBy: _chain.orderBy,
    startAfter: _chain.startAfter,
    add: _mockAdd,
  }));

  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));

  (firestoreFn as any).__mocks = {
    get: _mockGet,
    add: _mockAdd,
    where: _chain.where,
    limit: _chain.limit,
    orderBy: _chain.orderBy,
    startAfter: _chain.startAfter,
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
  fetchSessionPage,
  fetchSessionsForAssignment,
  SESSION_PAGE_SIZE,
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
  orderBy: jest.Mock;
  startAfter: jest.Mock;
  collection: jest.Mock;
  chain: {
    where: jest.Mock;
    limit: jest.Mock;
    orderBy: jest.Mock;
    startAfter: jest.Mock;
    get: jest.Mock;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  // Re-wire the chain after clearAllMocks resets call records.
  mocks.collection.mockReturnValue({
    where: mocks.where,
    limit: mocks.limit,
    orderBy: mocks.orderBy,
    startAfter: mocks.startAfter,
    add: mocks.add,
  });
  // Each method returns the chain so the full fluent chain resolves to .get().
  mocks.where.mockReturnValue(mocks.chain);
  mocks.limit.mockReturnValue(mocks.chain);
  mocks.orderBy.mockReturnValue(mocks.chain);
  mocks.startAfter.mockReturnValue(mocks.chain);
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

// ────────────────────────────────────────────────────────────────────────────
// fetchSessionPage — paginated reads (HIST-01/03)
// ────────────────────────────────────────────────────────────────────────────

describe('fetchSessionPage', () => {
  it('SESSION_PAGE_SIZE is 20', () => {
    expect(SESSION_PAGE_SIZE).toBe(20);
  });

  it('queries with where(clientId) + orderBy(date, desc) + limit(20) on first page (no cursor)', async () => {
    const docData = { clientId: 'client-1', date: '2026-06-01', assignmentId: 'a1' };
    const mockDocs = Array.from({ length: 20 }, (_, i) => ({
      id: `session-${i}`,
      data: () => ({ ...docData, date: `2026-06-${String(i + 1).padStart(2, '0')}` }),
    }));

    mocks.get.mockResolvedValueOnce({ empty: false, docs: mockDocs });

    const result = await fetchSessionPage('client-1', undefined);

    expect(mocks.where).toHaveBeenCalledWith('clientId', '==', 'client-1');
    expect(mocks.orderBy).toHaveBeenCalledWith('date', 'desc');
    expect(mocks.limit).toHaveBeenCalledWith(SESSION_PAGE_SIZE);
    // No startAfter on first page
    expect(mocks.startAfter).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(20);
  });

  it('includes startAfter(cursor) when a cursor is provided', async () => {
    const cursor = { id: 'cursor-doc' } as any;
    mocks.get.mockResolvedValueOnce({ empty: false, docs: [{ id: 'session-21', data: () => ({ clientId: 'client-1' }) }] });

    await fetchSessionPage('client-1', cursor);

    expect(mocks.startAfter).toHaveBeenCalledWith(cursor);
  });

  it('returns lastDoc as the last document when page is full (20 items)', async () => {
    const lastDocMock = { id: 'last-doc', data: () => ({ clientId: 'client-1', date: '2026-06-20' }) };
    const docs = Array.from({ length: 20 }, (_, i) =>
      i === 19
        ? lastDocMock
        : { id: `session-${i}`, data: () => ({ clientId: 'client-1', date: `2026-06-${String(i + 1).padStart(2, '0')}` }) }
    );

    mocks.get.mockResolvedValueOnce({ empty: false, docs });

    const result = await fetchSessionPage('client-1', undefined);

    // lastDoc is defined when items.length === SESSION_PAGE_SIZE
    expect(result.lastDoc).toBe(lastDocMock);
  });

  it('returns lastDoc as undefined when page is NOT full (< 20 items — last page)', async () => {
    const docs = [{ id: 'session-1', data: () => ({ clientId: 'client-1' }) }];
    mocks.get.mockResolvedValueOnce({ empty: false, docs });

    const result = await fetchSessionPage('client-1', undefined);

    // lastDoc is undefined when items.length < SESSION_PAGE_SIZE → signals last page
    expect(result.lastDoc).toBeUndefined();
  });

  it('returns empty items array when snap is empty', async () => {
    mocks.get.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await fetchSessionPage('client-1', undefined);

    expect(result.items).toHaveLength(0);
    expect(result.lastDoc).toBeUndefined();
  });

  it('maps docs to { ...data(), id } shape', async () => {
    const docData = { clientId: 'client-1', date: '2026-06-01', assignmentId: 'a1' };
    mocks.get.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'session-1', data: () => docData }],
    });

    const result = await fetchSessionPage('client-1', undefined);

    expect(result.items[0]).toEqual({ ...docData, id: 'session-1' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// fetchSessionsForAssignment — adherence batch read (HIST-04)
// ────────────────────────────────────────────────────────────────────────────

describe('fetchSessionsForAssignment', () => {
  it('queries with where(clientId) + where(assignmentId)', async () => {
    mocks.get.mockResolvedValueOnce({ empty: true, docs: [] });

    await fetchSessionsForAssignment('client-1', 'assignment-1');

    expect(mocks.where).toHaveBeenCalledWith('clientId', '==', 'client-1');
    expect(mocks.where).toHaveBeenCalledWith('assignmentId', '==', 'assignment-1');
  });

  it('returns empty array when snap.empty is true (RNFB v24: empty is a property)', async () => {
    // RNFB v24: snap.empty is a PROPERTY (no parentheses in the service).
    mocks.get.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await fetchSessionsForAssignment('client-1', 'assignment-1');

    expect(result).toEqual([]);
  });

  it('returns array of sessions when docs exist', async () => {
    const docData = { clientId: 'client-1', assignmentId: 'assignment-1', date: '2026-06-01' };
    mocks.get.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'session-1', data: () => docData }],
    });

    const result = await fetchSessionsForAssignment('client-1', 'assignment-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ ...docData, id: 'session-1' });
  });
});
