import { Alert } from 'react-native';

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
    Alert.alert(
      errorTitle,
      err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    );
  }
}
