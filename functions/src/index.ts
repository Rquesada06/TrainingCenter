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
export const createClientAccount = functions
  // maxInstances bounds worst-case concurrency (and therefore cost) — an MVP
  // with one trainer never needs more, and it caps runaway-loop spend.
  .runWith({ maxInstances: 10 })
  .https.onCall(
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
      const firebaseError = err as { code?: string; message?: string };
      const code = firebaseError.code ?? '';
      if (code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'An account with that email already exists.');
      }
      if (code === 'auth/invalid-email') {
        throw new functions.https.HttpsError('invalid-argument', 'The email address is invalid.');
      }
      if (code === 'auth/invalid-password') {
        throw new functions.https.HttpsError('invalid-argument', 'The password must be at least 6 characters.');
      }
      throw new functions.https.HttpsError('internal', `Auth user creation failed: ${firebaseError.message ?? 'unknown error'}`);
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

// ────────────────────────────────────────────────────────────────────────────
// createAssignment — v1 onCall
// ────────────────────────────────────────────────────────────────────────────

/**
 * createAssignment — v1 onCall
 *
 * Builds an immutable program snapshot from server-side reads and writes
 * one assignments document. Also marks any previous active assignment for
 * the same client as 'completed' in the same batch (atomic).
 *
 * Uses v1 functions.https.onCall (NOT v2) — same reasoning as createClientAccount:
 * v2 has auth propagation bugs with @react-native-firebase/functions.httpsCallable()
 * (Pitfall 5, STATE.md Phase 1 decision).
 *
 * Security boundary:
 *   - Unauthenticated callers → HttpsError('unauthenticated')
 *   - Non-trainer callers → HttpsError('permission-denied')
 *   - Program not owned by caller → HttpsError('not-found')
 *   - Client not owned by caller → HttpsError('permission-denied')
 *   - Invalid startDate format → HttpsError('invalid-argument')
 *   - Snapshot > 800KB → HttpsError('failed-precondition')  (Pitfall 6)
 *
 * Threat mitigations applied:
 *   T-02-04: Non-trainer rejection (role check)
 *   T-02-XPROG: Cross-trainer program ownership check
 *   T-02-XCLIENT: Cross-trainer client ownership check
 *   T-02-SNAP-SPOOF: Snapshot built server-side only; client sends {programId, clientId, startDate}
 *   T-02-SNAP-SIZE: 800KB pre-flight guard (Pitfall 6)
 *   T-02-DATE-FORMAT: YYYY-MM-DD regex enforcement (ASGN-04)
 *   T-02-CF-V2-AUTH: v1 onCall used for auth propagation
 */

// Local type copies (avoid cross-tsconfig imports from the RN app)

interface CreateAssignmentInput {
  programId: string;
  clientId: string;
  /** YYYY-MM-DD */
  startDate: string;
}

interface CreateAssignmentResult {
  assignmentId: string;
}

interface SnapshotExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number | null;
  duration: number | null;
  rest: number;
  notes: string | null;
  locationTypes: string[];
  videoUrl: string | null;
  imageUrl: string | null;
  alternativeExerciseId: string | null;
  alternativeExercise: SnapshotExercise | null;
  // Phase 05 Plan 01 — PRES-01/02/03: prescription snapshot fields (TIER 4)
  repsMin: number | null;
  repsMax: number | null;
  targetRpe: number | null;
  timed: boolean;
}

interface SnapshotDay {
  type: 'rest' | 'routine' | null;
  routineId: string | null;
  routine: { name: string; exercises: SnapshotExercise[] } | null;
}

interface AssignmentSnapshot {
  name: string;
  description: string;
  durationWeeks: number;
  weeks: Array<{ days: SnapshotDay[] }>;
}

export const createAssignment = functions
  // maxInstances bounds worst-case concurrency (and therefore cost).
  .runWith({ maxInstances: 10 })
  .https.onCall(
  async (data: CreateAssignmentInput, context) => {
    // Step 1: Reject unauthenticated callers
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const db = admin.firestore();

    // Step 2: Verify caller is a trainer
    const callerSnap = await db.doc(`users/${context.auth.uid}`).get();
    if (callerSnap.data()?.role !== 'trainer') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only trainers can create assignments.'
      );
    }

    // Step 3: Read program; verify ownership
    // NOTE: admin SDK uses `exists` as a boolean property (not a method)
    const programSnap = await db.doc(`programs/${data.programId}`).get();
    if (!programSnap.exists || programSnap.data()?.trainerId !== context.auth.uid) {
      throw new functions.https.HttpsError('not-found', 'Program not found.');
    }
    const programData = programSnap.data()!;

    // Step 4: Validate client — exists, is a client, belongs to this trainer
    const clientSnap = await db.doc(`users/${data.clientId}`).get();
    const clientData = clientSnap.data();
    if (
      !clientSnap.exists ||
      clientData?.role !== 'client' ||
      clientData?.trainerId !== context.auth.uid
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Client not found in your roster.'
      );
    }

    // Step 5: Validate startDate format (ASGN-04)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'startDate must be YYYY-MM-DD.'
      );
    }

    // Step 6: Build immutable snapshot
    // Collect unique routineIds and exerciseIds first, then resolve in parallel
    const weeks: Array<{ days: Array<string | 'rest' | null> }> = programData.weeks ?? [];

    // Collect unique routineIds (non-null, non-'rest')
    const routineIdSet = new Set<string>();
    for (const week of weeks) {
      for (const day of week.days ?? []) {
        if (day && day !== 'rest') routineIdSet.add(day);
      }
    }
    const uniqueRoutineIds = Array.from(routineIdSet);

    // Fetch all routines in parallel
    // NOTE: admin SDK uses `exists` as a boolean property (not a method)
    const routineSnaps = await Promise.all(
      uniqueRoutineIds.map((rId) => db.doc(`routines/${rId}`).get())
    );
    const routineMap: Record<string, FirebaseFirestoreAdminData> = {};
    for (let i = 0; i < uniqueRoutineIds.length; i++) {
      const snap = routineSnaps[i];
      if (snap.exists) {
        routineMap[uniqueRoutineIds[i]] = snap.data()!;
      }
    }

    // Collect unique exerciseIds (including alternatives)
    const exerciseIdSet = new Set<string>();
    for (const routineData of Object.values(routineMap)) {
      const exercises: Array<{ exerciseId?: string; alternativeExerciseId?: string }> =
        routineData.exercises ?? [];
      for (const ex of exercises) {
        if (ex.exerciseId) exerciseIdSet.add(ex.exerciseId);
        if (ex.alternativeExerciseId) exerciseIdSet.add(ex.alternativeExerciseId);
      }
    }
    const uniqueExerciseIds = Array.from(exerciseIdSet);

    // Fetch all exercises in parallel
    const exerciseSnaps = await Promise.all(
      uniqueExerciseIds.map((eId) => db.doc(`exercises/${eId}`).get())
    );
    const exerciseMap: Record<string, FirebaseFirestoreAdminData> = {};
    for (let i = 0; i < uniqueExerciseIds.length; i++) {
      const snap = exerciseSnaps[i];
      if (snap.exists) {
        exerciseMap[uniqueExerciseIds[i]] = snap.data()!;
      }
    }

    // Helper to build a SnapshotExercise from Firestore data + routine override
    function buildSnapshotExercise(
      routineEx: Record<string, unknown>,
      exData: FirebaseFirestoreAdminData
    ): SnapshotExercise {
      const altId: string | null = (routineEx.alternativeExerciseId as string) ?? null;
      const altData = altId ? exerciseMap[altId] : null;

      return {
        exerciseId: exData.id as string ?? routineEx.exerciseId as string,
        name: exData.name as string,
        sets: (routineEx.sets as number) ?? (exData.defaultSets as number) ?? 1,
        reps: (routineEx.reps as number | undefined) ?? (exData.defaultReps as number | undefined) ?? null,
        duration: (routineEx.duration as number | undefined) ?? (exData.defaultDuration as number | undefined) ?? null,
        rest: (routineEx.rest as number) ?? (exData.defaultRest as number) ?? 60,
        notes: (routineEx.notes as string | undefined) ?? null,
        locationTypes: (exData.locationTypes as string[]) ?? [],
        videoUrl: (exData.videoUrl as string | undefined) ?? null,
        imageUrl: (exData.imageUrl as string | undefined) ?? null,
        alternativeExerciseId: altId,
        // Phase 05 Plan 01 — PRES-01/02/03 (TIER 4): copy prescription fields from routineEx.
        // Mirror the reps/duration ?? null coalescing pattern (T-05-01: named fields only, no spread).
        repsMin: (routineEx.repsMin as number | undefined) ?? null,
        repsMax: (routineEx.repsMax as number | undefined) ?? null,
        targetRpe: (routineEx.targetRpe as number | undefined) ?? null,
        timed: (routineEx.timed as boolean | undefined) ?? false,
        alternativeExercise: altData
          ? {
              exerciseId: altId!,
              name: altData.name as string,
              sets: (altData.defaultSets as number) ?? 1,
              reps: (altData.defaultReps as number | undefined) ?? null,
              duration: (altData.defaultDuration as number | undefined) ?? null,
              rest: (altData.defaultRest as number) ?? 60,
              notes: null,
              locationTypes: (altData.locationTypes as string[]) ?? [],
              videoUrl: (altData.videoUrl as string | undefined) ?? null,
              imageUrl: (altData.imageUrl as string | undefined) ?? null,
              alternativeExerciseId: null,
              alternativeExercise: null,
              // Alternative exercise defaults: timed=false, others=null (no per-alt prescription)
              repsMin: null,
              repsMax: null,
              targetRpe: null,
              timed: false,
            }
          : null,
      };
    }

    // Build the snapshot
    const snapshotWeeks = weeks.map((week) => ({
      days: (week.days ?? []).map((day): SnapshotDay => {
        if (!day || day === 'rest') {
          return { type: day === 'rest' ? 'rest' : null, routineId: null, routine: null };
        }
        const rData = routineMap[day];
        if (!rData) {
          return { type: null, routineId: day, routine: null };
        }
        const routineExercises: SnapshotExercise[] = (
          (rData.exercises ?? []) as Array<Record<string, unknown>>
        )
          .map((routineEx) => {
            const exId = routineEx.exerciseId as string;
            const exData = exerciseMap[exId];
            if (!exData) return null;
            return buildSnapshotExercise(routineEx, exData);
          })
          .filter((e): e is SnapshotExercise => e !== null);

        return {
          type: 'routine',
          routineId: day,
          routine: { name: rData.name as string, exercises: routineExercises },
        };
      }),
    }));

    const snapshot: AssignmentSnapshot = {
      name: programData.name as string,
      description: (programData.description as string) ?? '',
      durationWeeks: programData.durationWeeks as number,
      weeks: snapshotWeeks,
    };

    // Step 7: Size safety guard (Pitfall 6 — 800KB pre-flight to stay under 1MiB limit)
    if (JSON.stringify(snapshot).length > 800_000) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Program too large for snapshot — split into shorter programs.'
      );
    }

    // Step 8: Query previous active assignments for this client
    const prevQuery = await db
      .collection('assignments')
      .where('clientId', '==', data.clientId)
      .where('status', '==', 'active')
      .get();

    // Step 9: Atomic batch write
    const batch = db.batch();
    const newRef = db.collection('assignments').doc();
    batch.set(newRef, {
      trainerId: context.auth.uid,
      clientId: data.clientId,
      programId: data.programId,
      status: 'active',
      startDate: data.startDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      snapshot,
    });
    prevQuery.docs.forEach((d) => batch.update(d.ref, { status: 'completed' }));
    await batch.commit();

    // Step 10: Return assignmentId
    const result: CreateAssignmentResult = { assignmentId: newRef.id };
    return result;
  }
);

// Internal type alias for Firestore document data
type FirebaseFirestoreAdminData = admin.firestore.DocumentData;
