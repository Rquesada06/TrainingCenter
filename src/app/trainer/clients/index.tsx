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

import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClients } from '@/hooks/useClients';
import { ClientListItem } from '@/components/clients/ClientListItem';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppBar } from '@/components/ui/AppBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { User } from '@/types/user';

export default function ClientsScreen() {
  const router = useRouter();
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState('');

  const allClients = clients ?? [];
  const query = search.trim().toLowerCase();
  const filtered = query
    ? allClients.filter((c) => c.name.toLowerCase().includes(query))
    : allClients;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <AppBar />
      <ScreenHeader
        eyebrow="Management Console"
        title="Client Roster"
        subtitle={
          isLoading
            ? undefined
            : `${allClients.length} ${allClients.length === 1 ? 'athlete' : 'athletes'}`
        }
        right={
          <PrimaryButton
            label="+ Add"
            onPress={() => router.push('/trainer/clients/add')}
          />
        }
      />
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Search */}
        {!isLoading && allClients.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#1A1A1A',
              borderWidth: 1,
              borderColor: '#2A2A2A',
              borderRadius: 8,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Ionicons name="search" size={16} color="#888888" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search athletes by name…"
              placeholderTextColor="#444444"
              style={{
                flex: 1,
                color: '#FFFFFF',
                fontSize: 15,
                paddingVertical: 10,
                marginLeft: 8,
              }}
            />
          </View>
        ) : null}

        {/* Loading state */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#00FF66" size="large" />
          </View>
        ) : (
          <FlatList<User>
            data={filtered}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <ClientListItem
                client={item}
                onPress={() => router.push(`/trainer/clients/${item.uid}`)}
              />
            )}
            ListEmptyComponent={
              query ? (
                <Text
                  style={{
                    color: '#888888',
                    fontSize: 14,
                    textAlign: 'center',
                    paddingVertical: 24,
                  }}
                >
                  No athletes match “{search.trim()}”.
                </Text>
              ) : (
                <EmptyState
                  icon={<Ionicons name="people-outline" size={40} color="#444444" />}
                  title="No clients yet"
                  message="Add your first client to get started."
                  ctaLabel="+ Add Client"
                  onCta={() => router.push('/trainer/clients/add')}
                />
              )
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
