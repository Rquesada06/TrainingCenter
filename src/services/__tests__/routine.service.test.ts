/**
 * routine.service tests — Phase 02 Plan 04 (ROUT-01..07)
 *
 * Covers:
 *   - listRoutines: scoped WHERE query + orderBy + doc mapping
 *   - getRoutine: single doc read + null handling
 *   - createRoutine: add with trainerId + serverTimestamp fields
 *   - updateRoutine: doc update with updatedAt serverTimestamp
 *   - deleteRoutine: doc deletion
 *
 * Threat T-02-01 / ROUT-07: WHERE trainerId filter is present in listRoutines.
 *
 * Mock strategy mirrors exercise.service.test.ts (Plan 02-02):
 *   jest.mock() is hoisted above const declarations. All mock fns are created
 *   inside the factory to avoid hoisting TDZ issues. Mocks are exposed on the
 *   returned module object and retrieved in tests via jest.requireMock().
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/firestore', () => {
  // All mock fns created inside the factory to avoid hoisting TDZ issues.
  const _mockGet = jest.fn();
  const _mockUpdate = jest.fn();
  const _mockDelete = jest.fn();
  const _mockAdd = jest.fn();
  const _mockDoc = jest.fn(() => ({ get: _mockGet, update: _mockUpdate, delete: _mockDelete }));
  const _mockOrderBy = jest.fn(() => ({ get: _mockGet }));
  const _mockWhere = jest.fn(() => ({ orderBy: _mockOrderBy, doc: _mockDoc }));
  const _mockCollection = jest.fn(() => ({ where: _mockWhere, doc: _mockDoc, add: _mockAdd }));
  const _mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');

  // The default export is a callable that returns the firestore instance.
  // `firestore.FieldValue.serverTimestamp` is accessed as a static property.
  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));
  (firestoreFn as any).FieldValue = { serverTimestamp: _mockServerTimestamp };

  // Expose all mock fns on the module for retrieval via jest.requireMock()
  (firestoreFn as any).__mocks = {
    get: _mockGet,
    update: _mockUpdate,
    delete: _mockDelete,
    add: _mockAdd,
    doc: _mockDoc,
    orderBy: _mockOrderBy,
    where: _mockWhere,
    collection: _mockCollection,
    serverTimestamp: _mockServerTimestamp,
  };

  return firestoreFn;
});

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import {
  listRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
} from '../routine.service';

// ────────────────────────────────────────────────────────────────────────────
// Mock accessor helpers (retrieved after imports)
// ────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const firestoreMock = jest.requireMock('@react-native-firebase/firestore');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocks = (firestoreMock as any).__mocks as {
  get: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  add: jest.Mock;
  doc: jest.Mock;
  orderBy: jest.Mock;
  where: jest.Mock;
  collection: jest.Mock;
  serverTimestamp: jest.Mock;
};

// ────────────────────────────────────────────────────────────────────────────
// listRoutines
// ────────────────────────────────────────────────────────────────────────────

describe('listRoutines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy, doc: mocks.doc });
    mocks.orderBy.mockReturnValue({ get: mocks.get });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it("calls where('trainerId', '==', uid) + orderBy('name', 'asc') + get() and maps docs to Routine[]", async () => {
    const uid = 'trainer-uid-123';
    const fakeDoc1 = {
      id: 'routine-1',
      data: () => ({
        trainerId: uid,
        name: 'Push Day',
        exercises: [],
        createdAt: 'ts1',
        updatedAt: 'ts1',
      }),
    };
    const fakeDoc2 = {
      id: 'routine-2',
      data: () => ({
        trainerId: uid,
        name: 'Pull Day',
        exercises: [],
        createdAt: 'ts2',
        updatedAt: 'ts2',
      }),
    };
    mocks.get.mockResolvedValueOnce({ docs: [fakeDoc1, fakeDoc2] });

    const result = await listRoutines(uid);

    expect(mocks.where).toHaveBeenCalledWith('trainerId', '==', uid);
    expect(mocks.orderBy).toHaveBeenCalledWith('name', 'asc');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'routine-1',
      trainerId: uid,
      name: 'Push Day',
      exercises: [],
      createdAt: 'ts1',
      updatedAt: 'ts1',
    });
    expect(result[1].id).toBe('routine-2');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getRoutine
// ────────────────────────────────────────────────────────────────────────────

describe('getRoutine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
  });

  it('returns { id, ...data } when doc exists', async () => {
    const docData = {
      trainerId: 'trainer-uid',
      name: 'Leg Day',
      exercises: [],
      createdAt: 'ts',
      updatedAt: 'ts',
    };
    mocks.get.mockResolvedValueOnce({ exists: true, id: 'routine-abc', data: () => docData });

    const result = await getRoutine('routine-abc');

    expect(mocks.doc).toHaveBeenCalledWith('routine-abc');
    expect(result).toEqual({ id: 'routine-abc', ...docData });
  });

  it('returns null when doc does not exist', async () => {
    mocks.get.mockResolvedValueOnce({ exists: false, id: 'ghost-id', data: () => undefined });

    const result = await getRoutine('ghost-id');

    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// createRoutine
// ────────────────────────────────────────────────────────────────────────────

describe('createRoutine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .add() with input + trainerId + serverTimestamp fields and returns doc id', async () => {
    const newDocRef = { id: 'new-routine-id' };
    mocks.add.mockResolvedValueOnce(newDocRef);

    const input = {
      name: 'Upper Body',
      exercises: [],
    };
    const trainerId = 'trainer-uid-456';

    const result = await createRoutine({ trainerId, input });

    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Upper Body',
        exercises: [],
        trainerId: 'trainer-uid-456',
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      })
    );
    expect(result).toBe('new-routine-id');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// updateRoutine
// ────────────────────────────────────────────────────────────────────────────

describe('updateRoutine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .doc(id).update() with partial + updatedAt serverTimestamp', async () => {
    mocks.update.mockResolvedValueOnce(undefined);

    const partial = { name: 'Updated Routine' };
    await updateRoutine('routine-xyz', partial);

    expect(mocks.doc).toHaveBeenCalledWith('routine-xyz');
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Routine',
        updatedAt: 'SERVER_TIMESTAMP',
      })
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// deleteRoutine
// ────────────────────────────────────────────────────────────────────────────

describe('deleteRoutine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
  });

  it('calls .doc(id).delete()', async () => {
    mocks.delete.mockResolvedValueOnce(undefined);

    await deleteRoutine('routine-to-delete');

    expect(mocks.doc).toHaveBeenCalledWith('routine-to-delete');
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });
});
