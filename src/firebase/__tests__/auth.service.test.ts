/**
 * auth.service tests — Phase 01 Plan 03
 * Covers:
 *   - signInSchema validation behaviors (3 tests)
 *   - sendPasswordReset AUTH-04 behavior (1 test)
 *
 * Threat model T-03-01: zod schema catches invalid input before any Firebase call.
 * Threat model T-03-02: generic error messages prevent account enumeration.
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

const mockSendPasswordResetEmail = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = jest.fn(() => ({
    onAuthStateChanged: jest.fn((_cb: unknown) => jest.fn()),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: mockSendPasswordResetEmail,
  }));
  return mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGet }));
  const mockCollection = jest.fn(() => ({ doc: mockDoc }));
  const mockFirestore = jest.fn(() => ({ collection: mockCollection }));
  return mockFirestore;
});

// google-signin pulls in the RNGoogleSignin native TurboModule, which is not
// available under Jest. Mock it so importing ../auth doesn't crash on load.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import { sendPasswordReset } from '../auth';
import { signInSchema } from '@/validation/auth.schema';

// ────────────────────────────────────────────────────────────────────────────
// signInSchema validation tests
// ────────────────────────────────────────────────────────────────────────────

describe('signInSchema — input validation (T-03-01)', () => {
  it('rejects an invalid email string with a field error', () => {
    const result = signInSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailErrors = result.error.flatten().fieldErrors.email;
      expect(emailErrors).toBeDefined();
      expect(emailErrors!.length).toBeGreaterThan(0);
    }
  });

  it('rejects an empty password with a field error', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.flatten().fieldErrors.password;
      expect(passwordErrors).toBeDefined();
      expect(passwordErrors!.length).toBeGreaterThan(0);
    }
  });

  it('accepts a valid email and non-empty password', () => {
    const result = signInSchema.safeParse({
      email: 'trainer@laufit.com',
      password: 'correctpassword',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('trainer@laufit.com');
      expect(result.data.password).toBe('correctpassword');
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// sendPasswordReset — AUTH-04
// ────────────────────────────────────────────────────────────────────────────

describe('sendPasswordReset — AUTH-04', () => {
  beforeEach(() => {
    mockSendPasswordResetEmail.mockClear();
  });

  it('calls sendPasswordResetEmail with the email and NO actionCodeSettings argument', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    await sendPasswordReset('user@example.com');

    // Must be called with exactly one argument (just the email)
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith('user@example.com');
    // Verify no second argument was passed (no actionCodeSettings)
    const callArgs = mockSendPasswordResetEmail.mock.calls[0];
    expect(callArgs).toHaveLength(1);
  });
});
