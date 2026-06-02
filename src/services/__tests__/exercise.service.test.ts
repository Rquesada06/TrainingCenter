/**
 * exercise.service tests — Phase 02 Plan 02 (EXER-01..06)
 *
 * Covers:
 *   - listExercises: scoped WHERE query + orderBy + doc mapping
 *   - getExercise: single doc read + null handling
 *   - createExercise: add with trainerId + serverTimestamp fields
 *   - updateExercise: doc update with updatedAt serverTimestamp
 *   - deleteExercise: doc deletion
 *
 * Threat T-02-01 / EXER-06: WHERE trainerId filter is present in listExercises.
 * Threat T-02-04: trainerId comes from authStore, not form input.
 *
 * Mock strategy:
 *   jest.mock() is hoisted above const declarations. To avoid temporal dead zone
 *   issues, the mock factory creates all mock functions internally. Mocks are
 *   exposed on the returned module object and retrieved in tests via
 *   jest.requireMock(). This mirrors the pattern used in auth.service.test.ts.
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
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../exercise.service';

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
// listExercises
// ────────────────────────────────────────────────────────────────────────────

describe('listExercises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-wire chain after clearAllMocks resets mock.calls (NOT implementations).
    // clearAllMocks preserves mockReturnValue, but we re-set here defensively.
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy, doc: mocks.doc });
    mocks.orderBy.mockReturnValue({ get: mocks.get });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls where(trainerId) + orderBy(name asc) + get() and maps docs to Exercise[]', async () => {
    const uid = 'trainer-uid-123';
    const fakeDoc1 = {
      id: 'exercise-1',
      data: () => ({
        trainerId: uid,
        name: 'Bench Press',
        category: 'strength',
        locationTypes: ['gym'],
        createdAt: 'ts1',
        updatedAt: 'ts1',
      }),
    };
    const fakeDoc2 = {
      id: 'exercise-2',
      data: () => ({
        trainerId: uid,
        name: 'Squat',
        category: 'strength',
        locationTypes: ['gym'],
        createdAt: 'ts2',
        updatedAt: 'ts2',
      }),
    };
    mocks.get.mockResolvedValueOnce({ docs: [fakeDoc1, fakeDoc2] });

    const result = await listExercises(uid);

    expect(mocks.where).toHaveBeenCalledWith('trainerId', '==', uid);
    expect(mocks.orderBy).toHaveBeenCalledWith('name', 'asc');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'exercise-1',
      trainerId: uid,
      name: 'Bench Press',
      category: 'strength',
      locationTypes: ['gym'],
      createdAt: 'ts1',
      updatedAt: 'ts1',
    });
    expect(result[1].id).toBe('exercise-2');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getExercise
// ────────────────────────────────────────────────────────────────────────────

describe('getExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
  });

  it('returns { id, ...data } when doc exists', async () => {
    const docData = {
      trainerId: 'trainer-uid',
      name: 'Deadlift',
      category: 'strength',
      locationTypes: ['gym'],
      createdAt: 'ts',
      updatedAt: 'ts',
    };
    mocks.get.mockResolvedValueOnce({ exists: true, id: 'exercise-abc', data: () => docData });

    const result = await getExercise('exercise-abc');

    expect(mocks.doc).toHaveBeenCalledWith('exercise-abc');
    expect(result).toEqual({ id: 'exercise-abc', ...docData });
  });

  it('returns null when doc does not exist', async () => {
    mocks.get.mockResolvedValueOnce({ exists: false, id: 'ghost-id', data: () => undefined });

    const result = await getExercise('ghost-id');

    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// createExercise
// ────────────────────────────────────────────────────────────────────────────

describe('createExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .add() with input + trainerId + serverTimestamp fields and returns doc id', async () => {
    const newDocRef = { id: 'new-exercise-id' };
    mocks.add.mockResolvedValueOnce(newDocRef);

    const input = {
      name: 'Pull-up',
      category: 'strength' as const,
      locationTypes: ['gym' as const],
    };
    const trainerId = 'trainer-uid-456';

    const result = await createExercise({ trainerId, input });

    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Pull-up',
        category: 'strength',
        locationTypes: ['gym'],
        trainerId: 'trainer-uid-456',
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      })
    );
    expect(result).toBe('new-exercise-id');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// updateExercise
// ────────────────────────────────────────────────────────────────────────────

describe('updateExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .doc(id).update() with partial + updatedAt serverTimestamp', async () => {
    mocks.update.mockResolvedValueOnce(undefined);

    const partial = { name: 'Updated Exercise', defaultSets: 4 };
    await updateExercise('exercise-xyz', partial);

    expect(mocks.doc).toHaveBeenCalledWith('exercise-xyz');
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Exercise',
        defaultSets: 4,
        updatedAt: 'SERVER_TIMESTAMP',
      })
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// deleteExercise
// ────────────────────────────────────────────────────────────────────────────

describe('deleteExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
  });

  it('calls .doc(id).delete()', async () => {
    mocks.delete.mockResolvedValueOnce(undefined);

    await deleteExercise('exercise-to-delete');

    expect(mocks.doc).toHaveBeenCalledWith('exercise-to-delete');
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });
});
