/**
 * Clients list screen — Phase 02 Plan 03 (CLNT-02, CLNT-05)
 *
 * D-1: The Clients tab is the trainer's primary dashboard.
 *
 * Shows all clients for the signed-in trainer, sorted by name A-Z.
 * Each row shows: avatar, name, active program name OR "No active program" badge (CLNT-05).
 * Tap "+ Add Client" to create a new client via the Cloud Function screen.
 * Tap a row to navigate to the client profile/edit screen.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useClients } from '@/hooks/useClients';
import { ClientListItem } from '@/components/clients/ClientListItem';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { User } from '@/types/user';

export default function ClientsScreen() {
  const router = useRouter();
  const { data: clients, isLoading } = useClients();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>
            Clients
          </Text>
          <PrimaryButton
            label="+ Add Client"
            onPress={() => router.push('/trainer/clients/add')}
          />
        </View>

        {/* Loading state */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#00FF66" size="large" />
          </View>
        ) : (
          <FlatList<User>
            data={clients ?? []}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <ClientListItem
                client={item}
                onPress={() => router.push(`/trainer/clients/${item.uid}`)}
              />
            )}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 80,
                }}
              >
                <Text style={{ color: '#888888', fontSize: 15, textAlign: 'center' }}>
                  No clients yet — tap Add Client to create one.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
