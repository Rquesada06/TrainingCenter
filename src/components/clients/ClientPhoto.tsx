/**
 * ClientPhoto — expo-image avatar with placeholder fallback.
 *
 * Phase 02 Plan 03 (CLNT-02, CLNT-03)
 *
 * Uses expo-image (not React Native's built-in Image) per CONTEXT.md decision
 * "Image: expo-image for client profile photos" and RESEARCH.md Pattern 8.
 *
 * When photoURL is null/undefined (the expected MVP state — RESEARCH.md Open Question 3:
 * createClientAccount CF does not upload a photo), renders a circular placeholder
 * with the first letter of the client's name in Obsidian Performance accent (#00FF66).
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

export interface ClientPhotoProps {
  /** URL of the client's profile photo. Null/undefined shows the initial placeholder. */
  photoURL?: string | null;
  /** Client's display name — used to derive the placeholder initial. */
  name: string;
  /** Avatar size in dp. Default: 48. */
  size?: number;
}

export function ClientPhoto({ photoURL, name, size = 48 }: ClientPhotoProps) {
  const borderRadius = size / 2;
  const fontSize = Math.round(size * 0.38); // ~38% of size for comfortable initial

  if (photoURL) {
    return (
      <Image
        source={photoURL}
        style={{ width: size, height: size, borderRadius }}
        contentFit="cover"
        transition={200}
      />
    );
  }

  // Placeholder: dark circle with electric-green initial
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#00FF66',
          fontSize,
          fontWeight: '600',
          lineHeight: fontSize * 1.2,
        }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
