/**
 * Client profile screen — Phase 02 Plan 03 (CLNT-03, CLNT-04)
 *
 * CLNT-03: Trainer taps a client row to view their profile — active program + start date.
 * HIST-03: Inline paginated session history for this client (shared useSessionHistory + SessionListItem).
 *
 * CLNT-04: Trainer can edit the client's name from this screen.
 *          Authorized server-side by the trainer-update-client Firestore rule added in Task 3.
 *          Role/trainerId/email remain locked regardless of what the trainer sends.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClient } from '@/hooks/useClient';
import { useActiveAssignment } from '@/hooks/useActiveAssignment';
import { useUpdateClient } from '@/hooks/useUpdateClient';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useAuthStore } from '@/stores/authStore';
import { ClientPhoto } from '@/components/clients/ClientPhoto';
import { SessionListItem } from '@/components/sessions/SessionListItem';
import { computePRs, volumeTrend } from '@/lib/insights';
import { PRCard } from '@/components/insights/PRCard';
import { VolumeChart } from '@/components/insights/VolumeChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { Session } from '@/types/session';

export default function ClientProfileScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();

  const client = useClient(clientId);
  const activeAssignment = useActiveAssignment(clientId);
  const updateClient = useUpdateClient();

  // HIST-03: this client's session history, newest-first paginated (shared hook + components).
  // Pass the trainer's uid so the query carries the `trainerId` filter the sessions
  // read rule requires — without it Firestore denies the whole read (T-04-01).
  const trainerUid = useAuthStore((s) => s.uid);
  const history = useSessionHistory(clientId, trainerUid ?? undefined);
  const sessions: Session[] = history.data?.pages.flatMap((p) => p.items) ?? [];
  // Per-client Insights (COAV-02) — PRs + volume from the loaded session history.
  const prs = computePRs(sessions);
  const volume = volumeTrend(sessions);

  // Local state for the editable name field
  const [nameValue, setNameValue] = useState('');
  const [savedConfirmation, setSavedConfirmation] = useState(false);

  // Initialize name from fetched client data
  useEffect(() => {
    if (client.data?.name) {
      setNameValue(client.data.name);
    }
  }, [client.data?.name]);

  // Loading state
  if (client.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00FF66" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
  if (!client.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#888888', fontSize: 16 }}>Client not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSaveName = () => {
    if (!nameValue.trim() || !clientId) return;
    updateClient.mutate(
      { uid: clientId, partial: { name: nameValue.trim() } },
      {
        onSuccess: () => {
          setSavedConfirmation(true);
          setTimeout(() => setSavedConfirmation(false), 2000);
        },
        onError: (err) => {
          Alert.alert(
            'Could not save name',
            err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          );
        },
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <PrimaryButton
          label="← Back"
          variant="outline"
          onPress={() => router.back()}
        />

        {/* ── Header: avatar + name + email ─────────────────────────────── */}
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 24 }}>
          <ClientPhoto
            photoURL={client.data.photoURL}
            name={client.data.name}
            size={96}
          />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: 'bold',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            {client.data.name}
          </Text>
          <Text
            style={{
              color: '#888888',
              fontSize: 14,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {client.data.email}
          </Text>
        </View>

        {/* ── Edit name (CLNT-04) ────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#1A1A1A',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}
          >
            EDIT PROFILE
          </Text>
          <TextField
            label="Name"
            value={nameValue}
            onChangeText={setNameValue}
          />
          <PrimaryButton
            label="Save Name"
            onPress={handleSaveName}
            loading={updateClient.isPending}
            disabled={!nameValue.trim() || nameValue.trim() === client.data.name}
          />
          {savedConfirmation && (
            <Text
              style={{
                color: '#00FF66',
                fontSize: 13,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Saved
            </Text>
          )}
          {updateClient.isError && (
            <Text
              style={{
                color: '#FF4444',
                fontSize: 13,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              {(updateClient.error as Error)?.message ?? 'Failed to save — please try again.'}
            </Text>
          )}
        </View>

        {/* ── Active program (CLNT-03) ───────────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#1A1A1A',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}
          >
            ACTIVE PROGRAM
          </Text>
          {activeAssignment.isLoading ? (
            <ActivityIndicator color="#00FF66" />
          ) : activeAssignment.data ? (
            <>
              <Text style={{ color: '#00FF66', fontSize: 18, fontWeight: '600' }}>
                {activeAssignment.data.snapshot.name}
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, marginTop: 4 }}>
                Started:{' '}
                <Text style={{ color: '#FFFFFF' }}>
                  {activeAssignment.data.startDate}
                </Text>
              </Text>
            </>
          ) : (
            <Text style={{ color: '#FFD600', fontSize: 15 }}>
              No active program assigned
            </Text>
          )}
        </View>

        {/* ── Insights (COAV-02) — PRs + volume trend for this client ────── */}
        {prs.length > 0 ? (
          <View style={{ marginBottom: 8 }}>
            <Text
              style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}
            >
              INSIGHTS
            </Text>
            <VolumeChart points={volume} title="Total volume over time (kg)" />
            {prs.map((pr) => (
              <PRCard key={pr.exerciseId} pr={pr} />
            ))}
          </View>
        ) : null}

        {/* ── Session history (HIST-03) — inline list, no nested scroll ──── */}
        <View>
          <Text
            style={{ color: '#888888', fontSize: 13, marginBottom: 8, fontWeight: '600' }}
          >
            SESSION HISTORY
          </Text>

          {history.isLoading ? (
            <ActivityIndicator color="#00FF66" style={{ marginVertical: 24 }} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="time-outline" size={40} color="#444444" />}
              title="No sessions yet"
              message="This client hasn't completed any workouts yet."
            />
          ) : (
            <>
              {sessions.map((s) => (
                <SessionListItem
                  key={s.id}
                  session={s}
                  onPress={() => router.push(`/client/history/${s.id}`)}
                />
              ))}
              {history.hasNextPage && (
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton
                    label="Load more"
                    variant="outline"
                    loading={history.isFetchingNextPage}
                    onPress={() => history.fetchNextPage()}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
