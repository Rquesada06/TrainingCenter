/**
 * Client Insights tab — Phase 6 (INST-01).
 *
 * Auto-detected personal records per lift (best estimated 1RM + heaviest weight,
 * with a NEW badge) computed from the client's session history. Volume-trend charts
 * (INST-02) land in a later slice (they need react-native-svg / a native rebuild).
 *
 * Aggregates over ALL sessions: useSessionHistory is paginated, so we auto-load the
 * remaining pages so PRs reflect the full history, not just the latest page.
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { computePRs } from '@/lib/insights';
import type { ExercisePR } from '@/lib/insights';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Session } from '@/types/session';

function PRCard({ pr }: { pr: ExercisePR }) {
  return (
    <View
      style={{
        backgroundColor: '#1A1A1A',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#2A2A2A',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}
          numberOfLines={1}
        >
          {pr.name}
        </Text>
        {pr.isNew ? (
          <View
            style={{
              backgroundColor: 'rgba(0,255,102,0.2)',
              borderWidth: 1,
              borderColor: '#00FF66',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: '#00FF66', fontSize: 11, fontWeight: '700' }}>NEW</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#888888' }}>Est. 1RM</Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#00FF66',
              fontFamily: 'JetBrainsMono-Regular',
            }}
          >
            {Math.round(pr.best1RM)}kg
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#888888' }}>Heaviest</Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#FFFFFF',
              fontFamily: 'JetBrainsMono-Regular',
            }}
          >
            {pr.heaviestWeight}kg
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const uid = useAuthStore((s) => s.uid);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSessionHistory(uid ?? undefined);

  // Auto-load remaining pages so PRs aggregate over the full history.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sessions: Session[] = data?.pages.flatMap((p) => p.items) ?? [];
  const prs = computePRs(sessions);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' }}>Insights</Text>
        <Text style={{ fontSize: 14, color: '#888888', marginTop: 2 }}>
          Personal records
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00FF66" size="large" />
        </View>
      ) : prs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<Ionicons name="stats-chart-outline" size={48} color="#444444" />}
            title="No records yet"
            message="Log some weighted sets in your workouts and your personal records will show up here."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {prs.map((pr) => (
            <PRCard key={pr.exerciseId} pr={pr} />
          ))}
          {isFetchingNextPage ? (
            <ActivityIndicator color="#00FF66" style={{ marginTop: 8 }} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
