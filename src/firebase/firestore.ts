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

// ────────────────────────────────────────────────────────────────────────────
// Typed collection reference
// ────────────────────────────────────────────────────────────────────────────

/**
 * Typed reference to the 'users' Firestore collection.
 * Use `usersCollection.doc(uid)` to get a typed document reference.
 */
export const usersCollection = (): FirebaseFirestoreTypes.CollectionReference<User> =>
  firestore().collection('users') as FirebaseFirestoreTypes.CollectionReference<User>;
