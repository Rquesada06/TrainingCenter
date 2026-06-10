import { Alert } from 'react-native';

const GENERIC = 'Something went wrong. Please try again.';

/**
 * Turn a thrown error into user-facing copy. Technical Firebase/auth/network
 * messages (codes, bracketed namespaces) are mapped to friendly text; plain
 * app-level messages pass through unchanged.
 */
export function friendlyErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return GENERIC;
  const m = err.message;
  if (/network|unavailable|timeout|offline/i.test(m)) {
    return 'Check your connection and try again.';
  }
  if (/permission-denied|insufficient|unauthorized|unauthenticated/i.test(m)) {
    return "You don't have permission to do that.";
  }
  // Hide raw Firebase/Firestore/Auth technical messages (e.g. "[firestore/...] ...").
  if (/firebase|firestore|\b[a-z-]+\/[a-z-]+\b/i.test(m)) return GENERIC;
  return m;
}

/**
 * Runs a save/delete mutation and surfaces any failure as a user-facing Alert
 * instead of an uncaught promise rejection (which crashes the screen with an
 * "Uncaught (in promise)" error and tells the user nothing).
 *
 * `onSuccess` runs only when the mutation resolves — so navigation/back only
 * happens on a real success.
 */
export async function withSaveFeedback(
  action: () => Promise<unknown>,
  onSuccess: () => void,
  errorTitle = 'Could not save',
): Promise<void> {
  try {
    await action();
    onSuccess();
  } catch (err) {
    Alert.alert(errorTitle, friendlyErrorMessage(err));
  }
}
