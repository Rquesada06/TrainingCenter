/**
 * storage.service tests — Phase 04 Plan 02 (PROF-01/02/03)
 *
 * Covers:
 *   - uploadProfilePhoto: storage().ref('users/{uid}/profile.jpg') + ref.putFile(uri)
 *     + ref.getDownloadURL(); returns the download URL string
 *   - updateUserProfile: usersCollection().doc(uid).update(stripUndefinedDeep(partial));
 *     undefined fields stripped before the write (photoURL + name allowlist only)
 *
 * Threat T-04-03: uploadProfilePhoto only ever refs users/{uid}/profile.jpg — combined
 *   with storage.rules (request.auth.uid == userId), a user can write only their own path.
 * Threat T-04-04: updateUserProfile only writes photoURL/name — role/trainerId locked by
 *   firestore.rules affectedKeys allowlist.
 *
 * Mock strategy: new RNFB storage mock factory (no codebase analog) + the firestore
 * hoisted-factory pattern mirrored from client.service.test.ts.
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/storage', () => {
  const _mockGetDownloadURL = jest.fn();
  const _mockPutFile = jest.fn();
  const _mockRef = jest.fn(() => ({ putFile: _mockPutFile, getDownloadURL: _mockGetDownloadURL }));
  const storageFn = jest.fn(() => ({ ref: _mockRef }));
  (storageFn as any).__mocks = {
    ref: _mockRef,
    putFile: _mockPutFile,
    getDownloadURL: _mockGetDownloadURL,
  };
  return { __esModule: true, default: storageFn };
});

jest.mock('@react-native-firebase/firestore', () => {
  const _mockGet = jest.fn();
  const _mockUpdate = jest.fn();
  const _mockDoc = jest.fn(() => ({ get: _mockGet, update: _mockUpdate }));
  const _mockCollection = jest.fn(() => ({ doc: _mockDoc }));
  const firestoreFn = jest.fn(() => ({ collection: _mockCollection }));
  (firestoreFn as any).__mocks = {
    get: _mockGet,
    update: _mockUpdate,
    doc: _mockDoc,
    collection: _mockCollection,
  };
  return firestoreFn;
});

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import { uploadProfilePhoto, updateUserProfile } from '../storage.service';

// ────────────────────────────────────────────────────────────────────────────
// Mock accessor helpers
// ────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const storageMock = jest.requireMock('@react-native-firebase/storage').default;
const storageMocks = (storageMock as any).__mocks as {
  ref: jest.Mock;
  putFile: jest.Mock;
  getDownloadURL: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const firestoreMock = jest.requireMock('@react-native-firebase/firestore');
const firestoreMocks = (firestoreMock as any).__mocks as {
  get: jest.Mock;
  update: jest.Mock;
  doc: jest.Mock;
  collection: jest.Mock;
};

// ────────────────────────────────────────────────────────────────────────────
// uploadProfilePhoto
// ────────────────────────────────────────────────────────────────────────────

describe('uploadProfilePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageMocks.ref.mockReturnValue({
      putFile: storageMocks.putFile,
      getDownloadURL: storageMocks.getDownloadURL,
    });
  });

  it("refs users/{uid}/profile.jpg, putFile(uri), getDownloadURL() and returns the URL", async () => {
    const uid = 'user-uid-123';
    const fileUri = 'file:///tmp/picked-photo.jpg';
    const downloadUrl = 'https://storage.example.com/users/user-uid-123/profile.jpg?token=abc';

    storageMocks.putFile.mockResolvedValueOnce(undefined);
    storageMocks.getDownloadURL.mockResolvedValueOnce(downloadUrl);

    const result = await uploadProfilePhoto(uid, fileUri);

    expect(storageMocks.ref).toHaveBeenCalledWith('users/user-uid-123/profile.jpg');
    expect(storageMocks.putFile).toHaveBeenCalledWith(fileUri);
    expect(storageMocks.getDownloadURL).toHaveBeenCalledTimes(1);
    expect(result).toBe(downloadUrl);
  });

  it("scopes the upload path to the user's own uid (T-04-03)", async () => {
    storageMocks.putFile.mockResolvedValueOnce(undefined);
    storageMocks.getDownloadURL.mockResolvedValueOnce('https://x/y');

    await uploadProfilePhoto('only-me', 'file:///photo.jpg');

    expect(storageMocks.ref).toHaveBeenCalledWith('users/only-me/profile.jpg');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// updateUserProfile
// ────────────────────────────────────────────────────────────────────────────

describe('updateUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreMocks.collection.mockReturnValue({ doc: firestoreMocks.doc });
    firestoreMocks.doc.mockReturnValue({ get: firestoreMocks.get, update: firestoreMocks.update });
  });

  it('writes photoURL + name to the user doc', async () => {
    firestoreMocks.update.mockResolvedValueOnce(undefined);

    await updateUserProfile('user-uid-456', {
      photoURL: 'https://storage.example.com/photo.jpg',
      name: 'New Name',
    });

    expect(firestoreMocks.doc).toHaveBeenCalledWith('user-uid-456');
    expect(firestoreMocks.update).toHaveBeenCalledWith({
      photoURL: 'https://storage.example.com/photo.jpg',
      name: 'New Name',
    });
  });

  it('strips undefined fields before the write (photoURL-only update)', async () => {
    firestoreMocks.update.mockResolvedValueOnce(undefined);

    await updateUserProfile('user-uid-789', {
      photoURL: 'https://storage.example.com/photo.jpg',
      name: undefined,
    });

    expect(firestoreMocks.update).toHaveBeenCalledWith({
      photoURL: 'https://storage.example.com/photo.jpg',
    });
    // name must NOT appear (undefined stripped — Firestore rejects undefined)
    const writtenArg = firestoreMocks.update.mock.calls[0][0];
    expect('name' in writtenArg).toBe(false);
  });

  it('strips undefined fields before the write (name-only update)', async () => {
    firestoreMocks.update.mockResolvedValueOnce(undefined);

    await updateUserProfile('user-uid-000', { name: 'Just A Name', photoURL: undefined });

    expect(firestoreMocks.update).toHaveBeenCalledWith({ name: 'Just A Name' });
    const writtenArg = firestoreMocks.update.mock.calls[0][0];
    expect('photoURL' in writtenArg).toBe(false);
  });
});
