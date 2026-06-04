/**
 * Client profile screen tests — Phase 04 Plan 06 (PROF-01)
 *
 * RED → GREEN behavior contract for the name + photo edit upgrade:
 *   - Renders the avatar (ClientPhoto) with the "Change profile photo" affordance
 *   - Renders the "EDIT PROFILE" name card with a Name field seeded from the user doc
 *   - "Save Name" is disabled until the name is dirty + non-empty
 *   - Editing the name + pressing Save calls updateProfile.mutate({ uid, partial:{ name }})
 *   - Tapping the avatar opens the photo action sheet (Take photo / Choose from library / Cancel)
 *   - Preserves the existing Sign out affordance
 *
 * Mock strategy: stub useUser/useUpdateProfile (data layer), authStore (uid),
 * expo-image-picker + storage.service (photo flow), and Alert.alert (action sheet).
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

// ── Mocks (before component import) ──────────────────────────────────────────

const mockMutate = jest.fn();
const mockUseUser = jest.fn();
const mockUseUpdateProfile = jest.fn();

jest.mock('@/hooks/useUser', () => ({
  useUser: (uid: string | undefined) => mockUseUser(uid),
}));

jest.mock('@/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => mockUseUpdateProfile(),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: any) => selector({ uid: 'client-uid-1' }),
}));

jest.mock('@/services/storage.service', () => ({
  uploadProfilePhoto: jest.fn(),
  updateUserProfile: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/firebase/auth', () => ({ signOut: jest.fn() }));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import ClientProfileScreen from '../profile';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ data: { name: 'Ada Client', photoURL: null } });
  mockUseUpdateProfile.mockReturnValue({ mutate: mockMutate, isPending: false });
});

describe('ClientProfileScreen — PROF-01', () => {
  it('renders the Profile title, the change-photo affordance, and the EDIT PROFILE card', () => {
    render(<ClientProfileScreen />);
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Change photo')).toBeTruthy();
    expect(screen.getByText('EDIT PROFILE')).toBeTruthy();
    expect(screen.getByLabelText('Change profile photo')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('seeds the Name field from the user doc', () => {
    render(<ClientProfileScreen />);
    expect(screen.getByDisplayValue('Ada Client')).toBeTruthy();
  });

  it('saves a dirty name via updateProfile.mutate with the trimmed value', () => {
    render(<ClientProfileScreen />);
    fireEvent.changeText(screen.getByDisplayValue('Ada Client'), '  Ada Lovelace  ');
    fireEvent.press(screen.getByText('Save Name'));
    // mutate(vars, options) — assert the variables payload (first arg).
    expect(mockMutate).toHaveBeenCalled();
    expect(mockMutate.mock.calls[0][0]).toEqual({
      uid: 'client-uid-1',
      partial: { name: 'Ada Lovelace' },
    });
  });

  it('opens the photo action sheet when the avatar is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<ClientProfileScreen />);
    fireEvent.press(screen.getByLabelText('Change profile photo'));
    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string }>;
    const labels = buttons.map((b) => b.text);
    expect(labels).toEqual(
      expect.arrayContaining(['Take photo', 'Choose from library', 'Cancel']),
    );
  });
});
