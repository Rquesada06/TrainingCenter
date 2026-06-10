/**
 * AppBar — top identity strip (StitchUI). Avatar + the signed-in user's name,
 * matching the design's "COACH LAU" header row. No notification bell — there is no
 * notifications system. Sits above a ScreenHeader on the main tab screens.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useUser } from '@/hooks/useUser';
import { ClientPhoto } from '@/components/clients/ClientPhoto';

export function AppBar() {
  const uid = useAuthStore((s) => s.uid);
  const { data } = useUser(uid ?? undefined);
  const name = data?.name ?? '';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
      }}
    >
      <ClientPhoto
        photoURL={data?.photoURL as string | null | undefined}
        name={name || '?'}
        size={36}
      />
      <Text
        style={{ flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 10 }}
        numberOfLines={1}
      >
        {name || 'LauFit'}
      </Text>
    </View>
  );
}
