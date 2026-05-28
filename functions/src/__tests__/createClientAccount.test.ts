/**
 * Emulator tests for createClientAccount Cloud Function.
 *
 * Run with:
 *   firebase emulators:exec --only auth,firestore "npx jest --testPathPattern=createClientAccount"
 *
 * These tests run against the Firebase Emulator Suite (auth + firestore).
 * They require FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST env vars
 * to be set, which firebase emulators:exec provides automatically.
 */

import * as admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const functions = require('firebase-functions-test');

// Set up emulator environment before importing the function
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

// Initialize the Firebase Functions test SDK
const testEnv = functions(
  {
    projectId: 'laufit-emulator-test',
  },
  // Path to service account (not needed for emulator)
);

// Initialize admin SDK for test setup/teardown
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'laufit-emulator-test' });
}

const db = admin.firestore();
const auth = admin.auth();

// Import the wrapped function after setting up emulators
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClientAccount } = require('../index');

const wrappedCreateClientAccount = testEnv.wrap(createClientAccount);

describe('createClientAccount Cloud Function', () => {
  const trainerUid = 'trainer-uid-123';
  const clientUid = 'client-uid-456';

  beforeEach(async () => {
    // Set up a trainer user in Firestore for the role check
    await db.doc(`users/${trainerUid}`).set({
      role: 'trainer',
      name: 'Test Trainer',
      email: 'trainer@test.com',
      trainerId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set up a client user in Firestore for the role check
    await db.doc(`users/${clientUid}`).set({
      role: 'client',
      name: 'Test Client',
      email: 'existing@test.com',
      trainerId: trainerUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  afterEach(async () => {
    // Clean up Firestore
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();
    usersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // Clean up Auth users created during tests
    try {
      const listResult = await auth.listUsers();
      for (const user of listResult.users) {
        await auth.deleteUser(user.uid);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  test('trainer creates client account — returns uid, creates Auth user and Firestore doc', async () => {
    const data = {
      name: 'New Client',
      email: 'newclient@test.com',
      temporaryPassword: 'TempPass123!',
    };

    const context = {
      auth: {
        uid: trainerUid,
        token: {},
      },
    };

    const result = await wrappedCreateClientAccount(data, context);

    expect(result).toHaveProperty('uid');
    expect(typeof result.uid).toBe('string');
    expect(result.uid.length).toBeGreaterThan(0);

    // Verify Auth user was created
    const authUser = await auth.getUserByEmail(data.email);
    expect(authUser.displayName).toBe(data.name);
    expect(authUser.uid).toBe(result.uid);

    // Verify Firestore doc was created
    const userDoc = await db.doc(`users/${result.uid}`).get();
    expect(userDoc.exists).toBe(true);
    const userData = userDoc.data();
    expect(userData?.role).toBe('client');
    expect(userData?.trainerId).toBe(trainerUid);
    expect(userData?.name).toBe(data.name);
    expect(userData?.email).toBe(data.email);
  });

  test('authenticated client caller — throws permission-denied', async () => {
    const data = {
      name: 'Another Client',
      email: 'another@test.com',
      temporaryPassword: 'TempPass123!',
    };

    const context = {
      auth: {
        uid: clientUid,
        token: {},
      },
    };

    await expect(wrappedCreateClientAccount(data, context)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  test('unauthenticated caller — throws unauthenticated', async () => {
    const data = {
      name: 'Any Client',
      email: 'any@test.com',
      temporaryPassword: 'TempPass123!',
    };

    const context = {};

    await expect(wrappedCreateClientAccount(data, context)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  test('duplicate email — throws already-exists', async () => {
    // First create the email in Auth
    await auth.createUser({
      email: 'duplicate@test.com',
      password: 'SomePass123!',
      displayName: 'Existing User',
    });

    const data = {
      name: 'Duplicate',
      email: 'duplicate@test.com',
      temporaryPassword: 'TempPass123!',
    };

    const context = {
      auth: {
        uid: trainerUid,
        token: {},
      },
    };

    await expect(wrappedCreateClientAccount(data, context)).rejects.toMatchObject({
      code: 'already-exists',
    });
  });
});
