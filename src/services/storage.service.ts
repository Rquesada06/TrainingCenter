/**
 * Storage service — Phase 04 Plan 02 (PROF-01/02/03)
 *
 * Pure async functions for Firebase Storage upload + Firestore photoURL write.
 * No React, no hooks — the UI layer consumes these via useMutation in useUpdateProfile.
 *
 * Security (T-04-03):
 *   uploadProfilePhoto only ever refs `users/{uid}/profile.jpg`. Combined with
 *   storage.rules (`request.auth.uid == userId`), a user can upload only to their
 *   own path — a client cannot overwrite another user's photo.
 *
 * Security (T-04-04):
 *   updateUserProfile only writes the non-privileged photoURL/name fields. The
 *   firestore.rules affectedKeys allowlist locks role/trainerId server-side, so a
 *   tampered partial cannot escalate privileges via this path.
 */

import storage from '@react-native-firebase/storage';
import { usersCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';

// ────────────────────────────────────────────────────────────────────────────
// Upload
// ────────────────────────────────────────────────────────────────────────────

/**
 * Uploads a local image file to the user's own profile photo path and returns
 * its download URL.
 *
 * @param uid     The signed-in user's uid (the only path they're authorized to write).
 * @param fileUri A local `file://` URI (e.g. from expo-image-picker). RNFB `putFile`
 *                accepts file:// URIs directly — no manual blob conversion needed.
 * @returns The Firebase Storage download URL for the uploaded photo.
 */
export async function uploadProfilePhoto(uid: string, fileUri: string): Promise<string> {
  const ref = storage().ref(`users/${uid}/profile.jpg`);
  await ref.putFile(fileUri);
  return await ref.getDownloadURL();
}

// ────────────────────────────────────────────────────────────────────────────
// Write
// ────────────────────────────────────────────────────────────────────────────

/**
 * Updates non-privileged profile fields (photoURL and/or name) on a user's doc.
 *
 * `stripUndefinedDeep` removes any `undefined`-valued keys before the write —
 * Firestore rejects `undefined` field values, and optional partials commonly
 * arrive with one field set and the other undefined (photo-only or name-only save).
 *
 * Only photoURL/name are ever written here; role/trainerId remain server-locked.
 */
export async function updateUserProfile(
  uid: string,
  partial: { photoURL?: string; name?: string }
): Promise<void> {
  await usersCollection().doc(uid).update(stripUndefinedDeep(partial));
}
