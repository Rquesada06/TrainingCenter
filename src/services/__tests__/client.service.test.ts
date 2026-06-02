/**
 * client.service tests — Phase 02 Plan 03 (CLNT-02..05)
 *
 * Covers:
 *   - listClients: scoped WHERE role='client' + WHERE trainerId + orderBy name + doc mapping
 *   - getClient: single doc read + null handling
 *   - updateClientProfile: doc update (name only — photo deferred to Phase 4)
 *   - findActiveAssignmentForClient: WHERE clientId + WHERE status='active' + limit(1) + null handling
 *
 * Threat T-02-03: listClients WHERE trainerId filter is present (trainer isolation).
 * Threat T-02-CLNT-EDIT: updateClientProfile only updates name — role/trainerId/email locked by Firestore rules.
 *
 * Mock strategy mirrors exercise.service.test.ts (jest.mock hoisted factory pattern).
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/firestore', () => {
  // All mock fns created inside the factory to avoid hoisting TDZ issues.
  const _mockGet = jest.fn();
  const _mockUpdate = jest.fn();
  const _mockDoc = jest.fn(() => ({ get: _mockGet, update: _mockUpdate }));
  const _mockLimit = jest.fn(() => ({ get: _mockGet }));
  const _mockOrderBy = jest.fn(() => ({ get: _mockGet }));
  // where chains: second where returns { orderBy, limit, doc }
  // We need where().where().orderBy().get() AND where().where().limit().get()
  const _mockWhere2 = jest.fn(() => ({ orderBy: _mockOrderBy, limit: _mockLimit }));
  const _mockWhere = jest.fn(() => ({ where: _mockWhere2, orderBy: _mockOrderBy, limit: _mockLimit }));
  const _mockCollection = jest.fn(() => ({ where: _mockWhere, doc: _mockDoc }));

  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));

  (firestoreFn as any).__mocks = {
    get: _mockGet,
    update: _mockUpdate,
    doc: _mockDoc,
    limit: _mockLimit,
    orderBy: _mockOrderBy,
    where2: _mockWhere2,
    where: _mockWhere,
    collection: _mockCollection,
  };

  return firestoreFn;
});

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import {
  listClients,
  getClient,
  updateClientProfile,
  findActiveAssignmentForClient,
} from '../client.service';

// ────────────────────────────────────────────────────────────────────────────
// Mock accessor helpers
// ────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const firestoreMock = jest.requireMock('@react-native-firebase/firestore');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocks = (firestoreMock as any).__mocks as {
  get: jest.Mock;
  update: jest.Mock;
  doc: jest.Mock;
  limit: jest.Mock;
  orderBy: jest.Mock;
  where2: jest.Mock;
  where: jest.Mock;
  collection: jest.Mock;
};

// ────────────────────────────────────────────────────────────────────────────
// listClients
// ────────────────────────────────────────────────────────────────────────────

describe('listClients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc });
    mocks.where.mockReturnValue({ where: mocks.where2, orderBy: mocks.orderBy, limit: mocks.limit });
    mocks.where2.mockReturnValue({ orderBy: mocks.orderBy, limit: mocks.limit });
    mocks.orderBy.mockReturnValue({ get: mocks.get });
  });

  it("calls where('role','client') + where('trainerId',uid) + orderBy('name','asc') and returns User[]", async () => {
    const trainerId = 'trainer-uid-123';
    const fakeDoc1 = {
      id: 'client-1',
      data: () => ({
        role: 'client' as const,
        trainerId,
        name: 'Alice Smith',
        email: 'alice@test.com',
        createdAt: 'ts1',
      }),
    };
    const fakeDoc2 = {
      id: 'client-2',
      data: () => ({
        role: 'client' as const,
        trainerId,
        name: 'Bob Jones',
        email: 'bob@test.com',
        createdAt: 'ts2',
      }),
    };
    mocks.get.mockResolvedValueOnce({ docs: [fakeDoc1, fakeDoc2] });

    const result = await listClients(trainerId);

    expect(mocks.where).toHaveBeenCalledWith('role', '==', 'client');
    expect(mocks.where2).toHaveBeenCalledWith('trainerId', '==', trainerId);
    expect(mocks.orderBy).toHaveBeenCalledWith('name', 'asc');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      uid: 'client-1',
      role: 'client',
      trainerId,
      name: 'Alice Smith',
      email: 'alice@test.com',
      createdAt: 'ts1',
    });
    expect(result[1].uid).toBe('client-2');
    // All results have role='client' and the requested trainerId
    expect(result.every((c) => c.role === 'client' && c.trainerId === trainerId)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getClient
// ────────────────────────────────────────────────────────────────────────────

describe('getClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update });
  });

  it('returns { uid, ...data } when doc exists', async () => {
    const docData = {
      role: 'client' as const,
      trainerId: 'trainer-uid',
      name: 'Alice Smith',
      email: 'alice@test.com',
      createdAt: 'ts',
    };
    mocks.get.mockResolvedValueOnce({ exists: true, id: 'client-abc', data: () => docData });

    const result = await getClient('client-abc');

    expect(mocks.doc).toHaveBeenCalledWith('client-abc');
    expect(result).toEqual({ uid: 'client-abc', ...docData });
  });

  it('returns null when doc does not exist', async () => {
    mocks.get.mockResolvedValueOnce({ exists: false, id: 'ghost-id', data: () => undefined });

    const result = await getClient('ghost-id');

    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// updateClientProfile
// ────────────────────────────────────────────────────────────────────────────

describe('updateClientProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update });
  });

  it("calls .doc(uid).update({ name }) — photo deferred to Phase 4", async () => {
    mocks.update.mockResolvedValueOnce(undefined);

    await updateClientProfile('client-uid-456', { name: 'New Name' });

    expect(mocks.doc).toHaveBeenCalledWith('client-uid-456');
    expect(mocks.update).toHaveBeenCalledWith({ name: 'New Name' });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// findActiveAssignmentForClient
// ────────────────────────────────────────────────────────────────────────────

describe('findActiveAssignmentForClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc });
    mocks.where.mockReturnValue({ where: mocks.where2, orderBy: mocks.orderBy, limit: mocks.limit });
    mocks.where2.mockReturnValue({ orderBy: mocks.orderBy, limit: mocks.limit });
    mocks.limit.mockReturnValue({ get: mocks.get });
  });

  it("calls where('clientId',clientId) + where('status','active') + limit(1) and returns the assignment", async () => {
    const clientId = 'client-id-789';
    const assignmentData = {
      id: 'assignment-1',
      trainerId: 'trainer-uid',
      clientId,
      programId: 'program-1',
      status: 'active' as const,
      startDate: '2026-06-01',
      createdAt: 'ts',
      snapshot: {
        name: 'Strength 8 Week',
        description: 'Program description',
        durationWeeks: 8,
        weeks: [],
      },
    };
    const fakeDoc = {
      id: 'assignment-1',
      data: () => assignmentData,
    };
    mocks.get.mockResolvedValueOnce({ docs: [fakeDoc] });

    const result = await findActiveAssignmentForClient(clientId);

    expect(mocks.where).toHaveBeenCalledWith('clientId', '==', clientId);
    expect(mocks.where2).toHaveBeenCalledWith('status', '==', 'active');
    expect(mocks.limit).toHaveBeenCalledWith(1);
    expect(result).not.toBeNull();
    expect(result?.snapshot.name).toBe('Strength 8 Week');
  });

  it('returns null when no active assignment exists', async () => {
    mocks.get.mockResolvedValueOnce({ docs: [] });

    const result = await findActiveAssignmentForClient('client-no-assign');

    expect(result).toBeNull();
  });
});
