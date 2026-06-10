/**
 * Trainer profile screen — Phase 04 Plan 06 (PROF-02).
 *
 * Mirrors the client profile (PROF-01) exactly: avatar (camera/library upload,
 * square crop) + name edit, with the existing sign-out preserved. The trainer
 * edits only their own user doc (D-07) — uid comes from authStore.
 *
 * Data layer: useUser (name + photoURL), useUpdateProfile (name/photoURL write),
 * storage.service.uploadProfilePhoto (Storage upload, users/{uid}/profile.jpg).
 * Photo capture via expo-image-picker (allowsEditing, aspect [1,1], quality 0.7,
 * mediaTypes 'images').
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { signOut } from '@/firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { useUser } from '@/hooks/useUser';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { uploadProfilePhoto } from '@/services/storage.service';
import { ClientPhoto } from '@/components/clients/ClientPhoto';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { withSaveFeedback } from '@/lib/mutationFeedback';

const AVATAR_SIZE = 96;

export default function TrainerProfileScreen() {
  const uid = useAuthStore((s) => s.uid);
  const user = useUser(uid ?? undefined);
  const updateProfile = useUpdateProfile();

  const [nameValue, setNameValue] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Seed the editable name from the loaded user doc (once).
  const loadedName = user.data?.name;
  if (!seeded && loadedName !== undefined) {
    setNameValue(loadedName);
    setSeeded(true);
  }

  const trimmed = nameValue.trim();
  const nameDirty = trimmed !== (user.data?.name ?? '');
  const saveDisabled = isUploading || !trimmed || !nameDirty;

  const handleSaveName = () => {
    if (!uid) return;
    setSaveError(false);
    setShowSaved(false);
    updateProfile.mutate(
      { uid, partial: { name: trimmed } },
      {
        onSuccess: () => {
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        },
        onError: () => setSaveError(true),
      },
    );
  };

  const pick = async (source: 'camera' | 'library') => {
    if (!uid) return;
    setIsUploading(true);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        mediaTypes: 'images',
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const url = await uploadProfilePhoto(uid, result.assets[0].uri);
        updateProfile.mutate({ uid, partial: { photoURL: url } });
      }
    } catch {
      Alert.alert(
        'Photo upload failed',
        'Could not upload your photo. Please check your connection and try again.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePhoto = () => {
    if (isUploading) return;
    Alert.alert('Change photo', '', [
      { text: 'Take photo', onPress: () => pick('camera') },
      { text: 'Choose from library', onPress: () => pick('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        // signOut triggers onAuthStateChanged → authStore.clear() → redirect to sign-in.
        onPress: () =>
          withSaveFeedback(() => signOut(), () => {}, 'Could not sign out'),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <ScreenHeader eyebrow="Account" title="Profile" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
      >
        {/* ── Avatar section ── */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Pressable
            onPress={handleChangePhoto}
            disabled={isUploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            accessibilityState={{ busy: isUploading }}
            style={{ minHeight: 44, opacity: isUploading ? 0.5 : 1 }}
          >
            <View>
              <ClientPhoto
                photoURL={user.data?.photoURL}
                name={user.data?.name ?? ''}
                size={AVATAR_SIZE}
              />
              {/* Camera overlay badge (bottom-right) */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#1A1A1A',
                  borderWidth: 1,
                  borderColor: '#444444',
                  borderRadius: 12,
                  padding: 6,
                }}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              </View>
              {/* Uploading overlay */}
              {isUploading ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: AVATAR_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator color="#00FF66" size="small" />
                </View>
              ) : null}
            </View>
          </Pressable>
          <Text style={{ color: '#888888', fontSize: 14, fontWeight: '400', marginTop: 8 }}>
            Change photo
          </Text>
        </View>

        {/* ── Name edit card ── */}
        <View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <Text style={{ color: '#888888', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
            EDIT PROFILE
          </Text>
          <TextField label="Name" value={nameValue} onChangeText={setNameValue} />
          <PrimaryButton
            label="Save Name"
            onPress={handleSaveName}
            loading={updateProfile.isPending}
            disabled={saveDisabled}
          />
          {showSaved ? (
            <Text
              style={{ color: '#00FF66', fontSize: 14, fontWeight: '400', marginTop: 8, textAlign: 'center' }}
            >
              Saved
            </Text>
          ) : null}
          {saveError ? (
            <Text
              style={{ color: '#EF4444', fontSize: 14, fontWeight: '400', marginTop: 8, textAlign: 'center' }}
            >
              Could not save name. Please try again.
            </Text>
          ) : null}
        </View>

        {/* ── Sign out ── */}
        <View style={{ marginTop: 24 }}>
          <PrimaryButton label="Sign out" variant="outline" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
