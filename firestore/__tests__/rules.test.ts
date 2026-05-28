/**
 * Firestore security rules tests.
 *
 * Run with:
 *   firebase emulators:exec --only firestore "npx jest --testPathPattern=rules"
 *
 * Tests use @firebase/rules-unit-testing against the Firestore emulator.
 * The emulator must have FIRESTORE_EMULATOR_HOST set (firebase emulators:exec provides this).
 *
 * Critical behavior tested:
 *   - Role-elevation denial (T-04-02): clients cannot promote themselves to trainer
 *   - trainerId change denial: clients cannot change their owning trainer
 *   - Own profile update allowed (name only): baseline write access works
 *   - Cross-user read denied: data isolation
 *   - Trainer/client scoping for exercises: trainer-owned data pattern
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'laufit-rules-test';
const TRAINER_UID = 'trainer-uid-test';
const CLIENT_UID = 'client-uid-test';
const OTHER_CLIENT_UID = 'other-client-uid-test';
const OTHER_TRAINER_UID = 'other-trainer-uid-test';

beforeAll(async () => {
  // Load firestore.rules from project root
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  // Seed test data using admin context (bypasses rules)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Trainer doc
    await db.doc(`users/${TRAINER_UID}`).set({
      role: 'trainer',
      name: 'Test Trainer',
      email: 'trainer@test.com',
      trainerId: null,
      createdAt: new Date(),
    });

    // Client doc
    await db.doc(`users/${CLIENT_UID}`).set({
      role: 'client',
      name: 'Test Client',
      email: 'client@test.com',
      trainerId: TRAINER_UID,
      createdAt: new Date(),
    });

    // Other client doc (different trainer)
    await db.doc(`users/${OTHER_CLIENT_UID}`).set({
      role: 'client',
      name: 'Other Client',
      email: 'other@test.com',
      trainerId: OTHER_TRAINER_UID,
      createdAt: new Date(),
    });

    // Exercise owned by trainer
    await db.doc(`exercises/exercise-1`).set({
      trainerId: TRAINER_UID,
      name: 'Squat',
      description: 'Barbell back squat',
    });

    // Exercise owned by other trainer
    await db.doc(`exercises/exercise-2`).set({
      trainerId: OTHER_TRAINER_UID,
      name: 'Bench Press',
      description: 'Barbell bench press',
    });
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('USERS collection security rules', () => {
  test('client writing { role: trainer } to own doc → PERMISSION_DENIED (role-elevation defense)', async () => {
    // T-04-02: A client must not be able to promote themselves to trainer
    const clientContext = testEnv.authenticatedContext(CLIENT_UID);
    const clientDb = clientContext.firestore();

    await assertFails(
      clientDb.doc(`users/${CLIENT_UID}`).update({ role: 'trainer' })
    );
  });

  test('client writing { trainerId: other } to own doc → PERMISSION_DENIED', async () => {
    // A client must not be able to change their trainer assignment
    const clientContext = testEnv.authenticatedContext(CLIENT_UID);
    const clientDb = clientContext.firestore();

    await assertFails(
      clientDb.doc(`users/${CLIENT_UID}`).update({ trainerId: OTHER_TRAINER_UID })
    );
  });

  test('client updating only own { name } → ALLOWED', async () => {
    // Clients can update their own non-privileged fields
    const clientContext = testEnv.authenticatedContext(CLIENT_UID);
    const clientDb = clientContext.firestore();

    await assertSucceeds(
      clientDb.doc(`users/${CLIENT_UID}`).update({ name: 'Updated Name' })
    );
  });

  test('client reading another user doc → PERMISSION_DENIED; reading own doc → ALLOWED', async () => {
    const clientContext = testEnv.authenticatedContext(CLIENT_UID);
    const clientDb = clientContext.firestore();

    // Reading another user's doc should be denied
    await assertFails(
      clientDb.doc(`users/${OTHER_CLIENT_UID}`).get()
    );

    // Reading own doc should be allowed
    await assertSucceeds(
      clientDb.doc(`users/${CLIENT_UID}`).get()
    );
  });
});

describe('EXERCISES collection security rules', () => {
  test('trainer reading own exercise → ALLOWED; reading other trainer exercise → DENIED', async () => {
    const trainerContext = testEnv.authenticatedContext(TRAINER_UID);
    const trainerDb = trainerContext.firestore();

    // Reading own exercise is allowed
    await assertSucceeds(
      trainerDb.doc(`exercises/exercise-1`).get()
    );

    // Reading another trainer's exercise is denied
    await assertFails(
      trainerDb.doc(`exercises/exercise-2`).get()
    );
  });

  test('trainer writing own exercise → ALLOWED; writing other trainer exercise → DENIED', async () => {
    const trainerContext = testEnv.authenticatedContext(TRAINER_UID);
    const trainerDb = trainerContext.firestore();

    // Creating own exercise is allowed
    await assertSucceeds(
      trainerDb.doc(`exercises/exercise-new`).set({
        trainerId: TRAINER_UID,
        name: 'Deadlift',
        description: 'Conventional deadlift',
      })
    );

    // Creating exercise with other trainer's ID is denied
    await assertFails(
      trainerDb.doc(`exercises/exercise-fake`).set({
        trainerId: OTHER_TRAINER_UID,
        name: 'Fake Exercise',
        description: 'Should be denied',
      })
    );
  });
});
