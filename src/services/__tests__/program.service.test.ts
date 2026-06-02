/**
 * program.service tests — Phase 02 Plan 05 (PROG-01..06)
 *
 * Covers:
 *   - listPrograms: scoped WHERE query + orderBy + doc mapping
 *   - getProgram: single doc read + null handling
 *   - createProgram: seeds weeks array of length durationWeeks, each with 7 null days (PROG-04)
 *   - updateProgram: doc update with updatedAt serverTimestamp; preserves existing weeks structure
 *   - deleteProgram: doc deletion
 *
 * Threat T-02-01 / PROG-06: WHERE trainerId filter is present in listPrograms.
 *
 * Mock strategy mirrors routine.service.test.ts (Plan 02-04) exactly.
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/firestore', () => {
  const _mockGet = jest.fn();
  const _mockUpdate = jest.fn();
  const _mockDelete = jest.fn();
  const _mockAdd = jest.fn();
  const _mockDoc = jest.fn(() => ({ get: _mockGet, update: _mockUpdate, delete: _mockDelete }));
  const _mockOrderBy = jest.fn(() => ({ get: _mockGet }));
  const _mockWhere = jest.fn(() => ({ orderBy: _mockOrderBy, doc: _mockDoc }));
  const _mockCollection = jest.fn(() => ({ where: _mockWhere, doc: _mockDoc, add: _mockAdd }));
  const _mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');

  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));
  (firestoreFn as any).FieldValue = { serverTimestamp: _mockServerTimestamp };

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
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
} from '../program.service';

// ────────────────────────────────────────────────────────────────────────────
// Mock accessor helpers
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
// listPrograms
// ────────────────────────────────────────────────────────────────────────────

describe('listPrograms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy, doc: mocks.doc });
    mocks.orderBy.mockReturnValue({ get: mocks.get });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it("calls where('trainerId', '==', uid) + orderBy('name', 'asc') + get() and maps docs to Program[]", async () => {
    const uid = 'trainer-uid-123';
    const week1 = { days: [null, null, null, null, null, null, null] };
    const fakeDoc1 = {
      id: 'program-1',
      data: () => ({
        trainerId: uid,
        name: 'Alpha Program',
        description: 'First program',
        durationWeeks: 1,
        weeks: [week1],
        createdAt: 'ts1',
        updatedAt: 'ts1',
      }),
    };
    const fakeDoc2 = {
      id: 'program-2',
      data: () => ({
        trainerId: uid,
        name: 'Beta Program',
        durationWeeks: 2,
        weeks: [week1, week1],
        createdAt: 'ts2',
        updatedAt: 'ts2',
      }),
    };
    mocks.get.mockResolvedValueOnce({ docs: [fakeDoc1, fakeDoc2] });

    const result = await listPrograms(uid);

    expect(mocks.where).toHaveBeenCalledWith('trainerId', '==', uid);
    expect(mocks.orderBy).toHaveBeenCalledWith('name', 'asc');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('program-1');
    expect(result[0].name).toBe('Alpha Program');
    expect(result[1].id).toBe('program-2');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getProgram
// ────────────────────────────────────────────────────────────────────────────

describe('getProgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
  });

  it('returns { id, ...data } when doc exists', async () => {
    const docData = {
      trainerId: 'trainer-uid',
      name: 'Test Program',
      durationWeeks: 4,
      weeks: [],
      createdAt: 'ts',
      updatedAt: 'ts',
    };
    mocks.get.mockResolvedValueOnce({
      exists: () => true,
      id: 'program-abc',
      data: () => docData,
    });

    const result = await getProgram('program-abc');

    expect(mocks.doc).toHaveBeenCalledWith('program-abc');
    expect(result).toEqual({ id: 'program-abc', ...docData });
  });

  it('returns null when doc does not exist', async () => {
    mocks.get.mockResolvedValueOnce({ exists: () => false, id: 'ghost-id', data: () => undefined });

    const result = await getProgram('ghost-id');

    expect(result).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// createProgram
// ────────────────────────────────────────────────────────────────────────────

describe('createProgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('auto-generates weeks array of length durationWeeks with 7 null days each (PROG-04)', async () => {
    const newDocRef = { id: 'new-program-id' };
    mocks.add.mockResolvedValueOnce(newDocRef);

    const input = {
      name: 'New Program',
      durationWeeks: 2,
    };
    const trainerId = 'trainer-uid-456';

    const result = await createProgram({ trainerId, input });

    const addArg = mocks.add.mock.calls[0][0];
    // PROG-04: weeks array auto-generated
    expect(addArg.weeks).toHaveLength(2);
    expect(addArg.weeks[0].days).toHaveLength(7);
    expect(addArg.weeks[0].days.every((d: unknown) => d === null)).toBe(true);
    expect(addArg.weeks[1].days).toHaveLength(7);
    expect(addArg.weeks[1].days.every((d: unknown) => d === null)).toBe(true);
    expect(addArg.trainerId).toBe(trainerId);
    expect(addArg.name).toBe('New Program');
    expect(result).toBe('new-program-id');
  });

  it('preserves provided weeks array if input includes it', async () => {
    const newDocRef = { id: 'prog-with-weeks' };
    mocks.add.mockResolvedValueOnce(newDocRef);

    const providedWeeks = [{ days: ['routine-1', null, null, null, null, null, null] }];
    const input = {
      name: 'Existing Program',
      durationWeeks: 1,
      weeks: providedWeeks,
    };

    await createProgram({ trainerId: 'trainer-uid', input });

    const addArg = mocks.add.mock.calls[0][0];
    expect(addArg.weeks).toEqual(providedWeeks);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// updateProgram
// ────────────────────────────────────────────────────────────────────────────

describe('updateProgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
    mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  });

  it('calls .doc(id).update() with partial + updatedAt serverTimestamp', async () => {
    mocks.update.mockResolvedValueOnce(undefined);

    const partial = { name: 'Updated Program' };
    await updateProgram('program-xyz', partial);

    expect(mocks.doc).toHaveBeenCalledWith('program-xyz');
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Program',
        updatedAt: 'SERVER_TIMESTAMP',
      })
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// deleteProgram
// ────────────────────────────────────────────────────────────────────────────

describe('deleteProgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.collection.mockReturnValue({ where: mocks.where, doc: mocks.doc, add: mocks.add });
    mocks.doc.mockReturnValue({ get: mocks.get, update: mocks.update, delete: mocks.delete });
  });

  it('calls .doc(id).delete()', async () => {
    mocks.delete.mockResolvedValueOnce(undefined);

    await deleteProgram('program-to-delete');

    expect(mocks.doc).toHaveBeenCalledWith('program-to-delete');
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });
});
