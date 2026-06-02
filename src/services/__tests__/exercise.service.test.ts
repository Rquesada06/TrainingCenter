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
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

const mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');
const mockAdd = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate, delete: mockDelete }));
const mockOrderBy = jest.fn();
const mockWhere = jest.fn();
const mockCollection = jest.fn();

// Build chainable mock: collection().where().orderBy().get()
mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, add: mockAdd });
mockWhere.mockReturnValue({ orderBy: mockOrderBy, doc: mockDoc });
mockOrderBy.mockReturnValue({ get: mockGet });

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
    FieldValue: {
      serverTimestamp: mockServerTimestamp,
    },
  }));
  // Expose FieldValue statically for `firestore.FieldValue.serverTimestamp()`
  mockFirestore.FieldValue = {
    serverTimestamp: mockServerTimestamp,
  };
  return mockFirestore;
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
// listExercises
// ────────────────────────────────────────────────────────────────────────────

describe('listExercises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, add: mockAdd });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ get: mockGet });
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
    mockGet.mockResolvedValueOnce({ docs: [fakeDoc1, fakeDoc2] });

    const result = await listExercises(uid);

    expect(mockWhere).toHaveBeenCalledWith('trainerId', '==', uid);
    expect(mockOrderBy).toHaveBeenCalledWith('name', 'asc');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'exercise-1', trainerId: uid, name: 'Bench Press', category: 'strength', locationTypes: ['gym'], createdAt: 'ts1', updatedAt: 'ts1' });
    expect(result[1].id).toBe('exercise-2');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getExercise
// ────────────────────────────────────────────────────────────────────────────

describe('getExercise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, add: mockAdd });
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
    mockGet.mockResolvedValueOnce({ exists: true, id: 'exercise-abc', data: () => docData });

    const result = await getExercise('exercise-abc');

    expect(mockDoc).toHaveBeenCalledWith('exercise-abc');
    expect(result).toEqual({ id: 'exercise-abc', ...docData });
  });

  it('returns null when doc does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false, id: 'ghost-id', data: () => undefined });

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
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, add: mockAdd });
    mockServerTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .add() with input + trainerId + serverTimestamp fields and returns doc id', async () => {
    const newDocRef = { id: 'new-exercise-id' };
    mockAdd.mockResolvedValueOnce(newDocRef);

    const input = {
      name: 'Pull-up',
      category: 'strength' as const,
      locationTypes: ['gym' as const],
    };
    const trainerId = 'trainer-uid-456';

    const result = await createExercise({ trainerId, input });

    expect(mockAdd).toHaveBeenCalledWith(
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
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, add: mockAdd });
    mockServerTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .doc(id).update() with partial + updatedAt serverTimestamp', async () => {
    mockUpdate.mockResolvedValueOnce(undefined);

    const partial = { name: 'Updated Exercise', defaultSets: 4 };
    await updateExercise('exercise-xyz', partial);

    expect(mockDoc).toHaveBeenCalledWith('exercise-xyz');
    expect(mockUpdate).toHaveBeenCalledWith(
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
    mockCollection.mockReturnValue({ where: mockWhere, doc: mockDoc, add: mockAdd });
  });

  it('calls .doc(id).delete()', async () => {
    mockDelete.mockResolvedValueOnce(undefined);

    await deleteExercise('exercise-to-delete');

    expect(mockDoc).toHaveBeenCalledWith('exercise-to-delete');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
