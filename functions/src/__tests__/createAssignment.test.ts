/**
 * Unit tests for createAssignment Cloud Function.
 *
 * Run with:
 *   cd functions && npm test -- --testPathPattern=createAssignment
 *
 * These tests use firebase-functions-test SDK with Firestore mocked at the
 * admin SDK level. Full emulator integration test is the checkpoint in Task 4.
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks — admin.firestore must be mocked before the function module loads
// ────────────────────────────────────────────────────────────────────────────

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

// Shared mock doc builder
const makeDocSnap = (exists: boolean, id: string, data: Record<string, unknown> | null) => ({
  exists: () => exists,
  id,
  data: () => (exists ? data : undefined),
});

// Per-test configurable doc resolver
let _docResolver: (path: string) => ReturnType<typeof makeDocSnap> = () =>
  makeDocSnap(false, '', null);
let _queryDocs: Array<ReturnType<typeof makeDocSnap> & { ref?: { id: string } }> = [];

// ────────────────────────────────────────────────────────────────────────────
// NOTE: jest.mock hoisting
// All mock constants must be defined before jest.mock() calls and referenced
// via closure, not by name capture (hoisting TDZ issue).
// ────────────────────────────────────────────────────────────────────────────

jest.mock('firebase-admin', () => {
  const batchMockLocal = {
    set: (...args: unknown[]) => mockBatchSet(...args),
    update: (...args: unknown[]) => mockBatchUpdate(...args),
    commit: () => mockBatchCommit(),
  };

  const newDocRef = { id: 'new-assignment-id' };

  const firestoreInstance = {
    doc: (path: string) => ({
      get: () => Promise.resolve(_docResolver(path)),
    }),
    collection: (colName: string) => {
      if (colName === 'assignments') {
        return {
          where: () => ({
            where: () => ({
              get: () => Promise.resolve({ docs: _queryDocs }),
            }),
          }),
          doc: () => newDocRef,
        };
      }
      return {
        where: () => ({}),
        doc: (docId: string) => ({
          get: () => Promise.resolve(_docResolver(docId)),
        }),
      };
    },
    batch: () => batchMockLocal,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firestoreFn: any = () => firestoreInstance;
  firestoreFn.FieldValue = {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  };

  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: firestoreFn,
    auth: jest.fn(),
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const functions = require('firebase-functions-test');
const testEnv = functions();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createAssignment } = require('../index');
const wrappedCreateAssignment = testEnv.wrap(createAssignment);

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

const TRAINER_UID = 'trainer-uid-test';
const CLIENT_UID = 'client-uid-test';
const PROGRAM_ID = 'program-id-test';
const ROUTINE_ID = 'routine-id-test';
const EXERCISE_ID = 'exercise-id-test';
const ALT_EXERCISE_ID = 'alt-exercise-id-test';

const trainerDoc = { role: 'trainer', name: 'Test Trainer', email: 'trainer@test.com' };
const clientDoc = { role: 'client', name: 'Test Client', email: 'client@test.com', trainerId: TRAINER_UID };
const exerciseDoc = {
  trainerId: TRAINER_UID,
  name: 'Back Squat',
  sets: 5,
  reps: 5,
  duration: null,
  rest: 90,
  notes: null,
  locationTypes: ['gym'],
  videoUrl: 'https://youtube.com/watch?v=test',
  imageUrl: null,
  alternativeExerciseId: ALT_EXERCISE_ID,
};
const altExerciseDoc = {
  trainerId: TRAINER_UID,
  name: 'Bodyweight Squat',
  sets: 3,
  reps: 20,
  duration: null,
  rest: 45,
  notes: null,
  locationTypes: ['home'],
  videoUrl: null,
  imageUrl: null,
  alternativeExerciseId: null,
};
const routineDoc = {
  trainerId: TRAINER_UID,
  name: 'Full Body A',
  exercises: [
    { exerciseId: EXERCISE_ID, name: 'Back Squat', sets: 5, reps: 5, rest: 90, alternativeExerciseId: ALT_EXERCISE_ID, order: 0 },
  ],
};
const programDoc = {
  trainerId: TRAINER_UID,
  name: 'Test Program',
  description: 'Smoke test',
  durationWeeks: 1,
  weeks: [{ days: [ROUTINE_ID, null, null, null, null, null, null] }],
};

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('createAssignment Cloud Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
    _queryDocs = [];
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  test('rejects unauthenticated caller with HttpsError unauthenticated', async () => {
    const context = {};
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-01' };

    await expect(wrappedCreateAssignment(data, context)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  test('rejects non-trainer caller (role=client) with HttpsError permission-denied', async () => {
    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, { role: 'client' });
      return makeDocSnap(false, '', null);
    };

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-01' };

    await expect(wrappedCreateAssignment(data, context)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  test('rejects when program.trainerId !== context.auth.uid with HttpsError not-found', async () => {
    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, trainerDoc);
      if (path === `programs/${PROGRAM_ID}`) return makeDocSnap(true, PROGRAM_ID, { ...programDoc, trainerId: 'other-trainer' });
      return makeDocSnap(false, '', null);
    };

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-01' };

    await expect(wrappedCreateAssignment(data, context)).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  test('successful call builds snapshot and writes assignment doc, returns { assignmentId }', async () => {
    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, trainerDoc);
      if (path === `programs/${PROGRAM_ID}`) return makeDocSnap(true, PROGRAM_ID, programDoc);
      if (path === `users/${CLIENT_UID}`) return makeDocSnap(true, CLIENT_UID, clientDoc);
      if (path === `routines/${ROUTINE_ID}`) return makeDocSnap(true, ROUTINE_ID, routineDoc);
      if (path === `exercises/${EXERCISE_ID}`) return makeDocSnap(true, EXERCISE_ID, exerciseDoc);
      if (path === `exercises/${ALT_EXERCISE_ID}`) return makeDocSnap(true, ALT_EXERCISE_ID, altExerciseDoc);
      return makeDocSnap(false, '', null);
    };

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-01' };

    const result = await wrappedCreateAssignment(data, context);

    expect(result).toHaveProperty('assignmentId');
    expect(typeof result.assignmentId).toBe('string');
    expect(result.assignmentId.length).toBeGreaterThan(0);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    const setPayload = mockBatchSet.mock.calls[0][1];
    expect(setPayload).toMatchObject({
      trainerId: TRAINER_UID,
      clientId: CLIENT_UID,
      programId: PROGRAM_ID,
      status: 'active',
      startDate: '2026-06-01',
    });
    expect(setPayload.snapshot).toBeDefined();
    expect(setPayload.snapshot.name).toBe('Test Program');
    expect(setPayload.snapshot.durationWeeks).toBe(1);
  });

  test('previous active assignment for same clientId is marked status=completed in batch', async () => {
    const prevRef = { id: 'prev-assignment-id' };
    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, trainerDoc);
      if (path === `programs/${PROGRAM_ID}`) return makeDocSnap(true, PROGRAM_ID, programDoc);
      if (path === `users/${CLIENT_UID}`) return makeDocSnap(true, CLIENT_UID, clientDoc);
      if (path === `routines/${ROUTINE_ID}`) return makeDocSnap(true, ROUTINE_ID, routineDoc);
      if (path === `exercises/${EXERCISE_ID}`) return makeDocSnap(true, EXERCISE_ID, exerciseDoc);
      if (path === `exercises/${ALT_EXERCISE_ID}`) return makeDocSnap(true, ALT_EXERCISE_ID, altExerciseDoc);
      return makeDocSnap(false, '', null);
    };
    _queryDocs = [
      { ...makeDocSnap(true, 'prev-assignment-id', { status: 'active' }), ref: prevRef },
    ];

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-02' };

    await wrappedCreateAssignment(data, context);

    expect(mockBatchUpdate).toHaveBeenCalledWith(prevRef, { status: 'completed' });
  });

  test('rejects when snapshot exceeds 800_000 bytes with HttpsError failed-precondition', async () => {
    const hugeExercises = Array.from({ length: 500 }, (_, i) => ({
      exerciseId: `ex-${i}`,
      name: `Exercise with a very very very very very very very very long name ${i}`,
      sets: 5,
      reps: 10,
      rest: 90,
      order: i,
      notes: 'Long note '.repeat(50),
    }));

    const hugeRoutine = {
      trainerId: TRAINER_UID,
      name: 'Massive Routine',
      exercises: hugeExercises,
    };

    const hugeProgram = {
      trainerId: TRAINER_UID,
      name: 'Huge Program',
      description: 'Test size guard',
      durationWeeks: 26,
      weeks: Array.from({ length: 26 }, () => ({ days: Array(7).fill(ROUTINE_ID) })),
    };

    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, trainerDoc);
      if (path === `programs/${PROGRAM_ID}`) return makeDocSnap(true, PROGRAM_ID, hugeProgram);
      if (path === `users/${CLIENT_UID}`) return makeDocSnap(true, CLIENT_UID, clientDoc);
      if (path.startsWith(`routines/`)) return makeDocSnap(true, ROUTINE_ID, hugeRoutine);
      if (path.startsWith(`exercises/`)) {
        return makeDocSnap(true, 'ex-0', {
          trainerId: TRAINER_UID,
          name: `Exercise long name `.repeat(20),
          sets: 5,
          reps: 10,
          duration: null,
          rest: 90,
          notes: 'Long note '.repeat(50),
          locationTypes: ['gym'],
          videoUrl: null,
          imageUrl: null,
          alternativeExerciseId: null,
        });
      }
      return makeDocSnap(false, '', null);
    };

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-01' };

    await expect(wrappedCreateAssignment(data, context)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  test('rejects invalid startDate format with HttpsError invalid-argument', async () => {
    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, trainerDoc);
      if (path === `programs/${PROGRAM_ID}`) return makeDocSnap(true, PROGRAM_ID, programDoc);
      if (path === `users/${CLIENT_UID}`) return makeDocSnap(true, CLIENT_UID, clientDoc);
      return makeDocSnap(false, '', null);
    };

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: 'not-a-date' };

    await expect(wrappedCreateAssignment(data, context)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  test('returns { assignmentId: string } on success', async () => {
    _docResolver = (path) => {
      if (path === `users/${TRAINER_UID}`) return makeDocSnap(true, TRAINER_UID, trainerDoc);
      if (path === `programs/${PROGRAM_ID}`) return makeDocSnap(true, PROGRAM_ID, programDoc);
      if (path === `users/${CLIENT_UID}`) return makeDocSnap(true, CLIENT_UID, clientDoc);
      if (path === `routines/${ROUTINE_ID}`) return makeDocSnap(true, ROUTINE_ID, routineDoc);
      if (path === `exercises/${EXERCISE_ID}`) return makeDocSnap(true, EXERCISE_ID, exerciseDoc);
      if (path === `exercises/${ALT_EXERCISE_ID}`) return makeDocSnap(true, ALT_EXERCISE_ID, altExerciseDoc);
      return makeDocSnap(false, '', null);
    };

    const context = { auth: { uid: TRAINER_UID, token: {} } };
    const data = { programId: PROGRAM_ID, clientId: CLIENT_UID, startDate: '2026-06-01' };

    const result = await wrappedCreateAssignment(data, context);

    expect(typeof result.assignmentId).toBe('string');
    expect(result.assignmentId.length).toBeGreaterThan(0);
  });
});
