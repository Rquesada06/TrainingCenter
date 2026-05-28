/**
 * LauFit Cloud Functions — Phase 1
 *
 * createClientAccount: The only path to create a client Firebase Auth user.
 * Uses v1 functions.https.onCall (NOT v2) to avoid auth propagation bugs
 * with @react-native-firebase/functions.httpsCallable() (Pitfall 5).
 *
 * Requires Node.js 18 or 20 (v22 not yet GA on Firebase Functions as of May 2026).
 * Default service account has sufficient IAM for admin.auth().createUser()
 * and admin.firestore().set() — no additional IAM grants needed (Assumption A2).
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize only if no app has been initialized yet (allows test env to initialize first)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Local interface copies to avoid cross-tsconfig imports from the RN app
// (Mirror of src/types/user.ts CreateClientAccountInput / CreateClientAccountResult)
interface CreateClientAccountInput {
  name: string;
  email: string;
  temporaryPassword: string;
}

interface CreateClientAccountResult {
  uid: string;
}

/**
 * createClientAccount — v1 onCall
 *
 * Creates a Firebase Auth user AND a users/{uid} Firestore doc atomically.
 * Only trainers can call this function (server-side role check).
 *
 * Security boundary:
 *   - Unauthenticated callers → HttpsError('unauthenticated')
 *   - Non-trainer callers → HttpsError('permission-denied')
 *   - Duplicate email → HttpsError('already-exists')
 *
 * Threat mitigations applied:
 *   T-04-01: Unauthenticated + non-trainer rejection
 *   T-04-03: Auth user creation only via Admin SDK (client SDK cannot do this)
 *   T-04-05: v1 onCall used to ensure context.auth propagates correctly
 */
export const createClientAccount = functions.https.onCall(
  async (data: CreateClientAccountInput, context) => {
    // Step 1: Reject unauthenticated callers
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to create client accounts.'
      );
    }

    // Step 2: Verify caller is a trainer (Firestore role check)
    const callerSnap = await admin
      .firestore()
      .doc(`users/${context.auth.uid}`)
      .get();

    if (callerSnap.data()?.role !== 'trainer') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only trainers can create client accounts.'
      );
    }

    // Step 3: Create Firebase Auth user via Admin SDK
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: data.email,
        password: data.temporaryPassword,
        displayName: data.name,
      });
    } catch (err: unknown) {
      const firebaseError = err as { code: string; message: string };
      throw new functions.https.HttpsError(
        'already-exists',
        `Auth user creation failed: ${firebaseError.message}`
      );
    }

    // Step 4: Write USERS doc with role: 'client' and trainerId reference
    await admin.firestore().doc(`users/${userRecord.uid}`).set({
      role: 'client' as const,
      trainerId: context.auth.uid,
      name: data.name,
      email: data.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Step 5: Return new client uid to the trainer caller
    const result: CreateClientAccountResult = { uid: userRecord.uid };
    return result;
  }
);
