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
import { computePRs, volumeTrend } from '@/lib/insights';
import { PRCard } from '@/components/insights/PRCard';
import { VolumeChart } from '@/components/insights/VolumeChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppBar } from '@/components/ui/AppBar';
import type { Session } from '@/types/session';

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
  const volume = volumeTrend(sessions);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <AppBar />
      <ScreenHeader
        eyebrow="Performance Overview"
        title="Insights"
        subtitle="Personal records"
      />

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
          <VolumeChart points={volume} title="Total volume over time (kg)" />
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
