/**
 * Typed Firestore collection references — Phase 01 Plan 02
 *
 * Centralises the 'users' collection reference so the auth listener
 * and future plans never stringer-type 'users' directly.
 *
 * @react-native-firebase/firestore auto-initialises from google-services.json /
 * GoogleService-Info.plist — no explicit firestore() config call needed.
 */

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import type { User } from '@/types/user';
import type { Exercise } from '@/types/exercise';
import type { Routine } from '@/types/routine';
import type { Program } from '@/types/program';
import type { Assignment } from '@/types/assignment';

// ────────────────────────────────────────────────────────────────────────────
// Typed collection references
// ────────────────────────────────────────────────────────────────────────────

/**
 * Typed reference to the 'users' Firestore collection.
 * Use `usersCollection().doc(uid)` to get a typed document reference.
 */
export const usersCollection = (): FirebaseFirestoreTypes.CollectionReference<User> =>
  firestore().collection('users') as FirebaseFirestoreTypes.CollectionReference<User>;

/**
 * Typed reference to the 'exercises' collection (Phase 2 — EXER-*).
 * Scope queries by `.where('trainerId', '==', uid).orderBy('name')`.
 */
export const exercisesCollection = (): FirebaseFirestoreTypes.CollectionReference<Exercise> =>
  firestore().collection('exercises') as FirebaseFirestoreTypes.CollectionReference<Exercise>;

/**
 * Typed reference to the 'routines' collection (Phase 2 — ROUT-*).
 */
export const routinesCollection = (): FirebaseFirestoreTypes.CollectionReference<Routine> =>
  firestore().collection('routines') as FirebaseFirestoreTypes.CollectionReference<Routine>;

/**
 * Typed reference to the 'programs' collection (Phase 2 — PROG-*).
 */
export const programsCollection = (): FirebaseFirestoreTypes.CollectionReference<Program> =>
  firestore().collection('programs') as FirebaseFirestoreTypes.CollectionReference<Program>;

/**
 * Typed reference to the 'assignments' collection (Phase 2 — ASGN-*).
 */
export const assignmentsCollection = (): FirebaseFirestoreTypes.CollectionReference<Assignment> =>
  firestore().collection('assignments') as FirebaseFirestoreTypes.CollectionReference<Assignment>;
