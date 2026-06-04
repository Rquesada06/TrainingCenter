/**
 * Trainer profile screen tests — Phase 04 Plan 06 (PROF-02)
 *
 * Mirrors the client profile contract: avatar change-photo affordance, EDIT
 * PROFILE name card (seeded + dirty-gated save), photo action sheet, and the
 * preserved sign-out. The trainer edits their own user doc (uid from authStore).
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

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
  useAuthStore: (selector: any) => selector({ uid: 'trainer-uid-1' }),
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

import TrainerProfileScreen from '../profile';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUser.mockReturnValue({ data: { name: 'Lau Trainer', photoURL: null } });
  mockUseUpdateProfile.mockReturnValue({ mutate: mockMutate, isPending: false });
});

describe('TrainerProfileScreen — PROF-02', () => {
  it('renders the avatar affordance, EDIT PROFILE card, and sign out', () => {
    render(<TrainerProfileScreen />);
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Change photo')).toBeTruthy();
    expect(screen.getByText('EDIT PROFILE')).toBeTruthy();
    expect(screen.getByLabelText('Change profile photo')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('seeds the Name field from the trainer doc', () => {
    render(<TrainerProfileScreen />);
    expect(screen.getByDisplayValue('Lau Trainer')).toBeTruthy();
  });

  it('saves a dirty name with the trainer uid and trimmed value', () => {
    render(<TrainerProfileScreen />);
    fireEvent.changeText(screen.getByDisplayValue('Lau Trainer'), '  Laura Coach  ');
    fireEvent.press(screen.getByText('Save Name'));
    expect(mockMutate.mock.calls[0][0]).toEqual({
      uid: 'trainer-uid-1',
      partial: { name: 'Laura Coach' },
    });
  });

  it('opens the photo action sheet when the avatar is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<TrainerProfileScreen />);
    fireEvent.press(screen.getByLabelText('Change profile photo'));
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string }>;
    expect(buttons.map((b) => b.text)).toEqual(
      expect.arrayContaining(['Take photo', 'Choose from library', 'Cancel']),
    );
  });
});
