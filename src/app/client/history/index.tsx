/**
 * Client session history list — Phase 04 Plan 04 (HIST-01)
 *
 * Paginated, newest-first list of the signed-in client's completed sessions.
 * Consumes the Wave 1 useSessionHistory infinite-query hook (D-04) and the shared
 * SessionListItem / EmptyState components. Tapping a row pushes the session detail.
 *
 * Pagination (RESEARCH.md Pattern 1): onEndReached fetches the next page only when
 * `!isFetchingNextPage && hasNextPage` to avoid duplicate fetches on RN's
 * over-eager onEndReached firing.
 */

import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { SessionListItem } from '@/components/sessions/SessionListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Session } from '@/types/session';

export default function ClientHistoryScreen() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.uid);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSessionHistory(uid ?? undefined);

  const sessions: Session[] = data?.pages.flatMap((p) => p.items) ?? [];

  // Initial load — full-screen centered spinner.
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '600', color: '#FFFFFF' }}>
            History
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00FF66" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Error — copy from UI-SPEC § 1.
  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '600', color: '#FFFFFF' }}>
            History
          </Text>
        </View>
        <View style={{ flex: 1, paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
            Could not load sessions
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: '#888888', textAlign: 'center', marginTop: 8 }}>
            Check your connection and pull to refresh.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 }}>
          History
        </Text>
      </View>
      <FlatList<Session>
        data={sessions}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SessionListItem
            session={item}
            onPress={() => router.push(`/client/history/${item.id}`)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (!isFetchingNextPage && hasNextPage) fetchNextPage();
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#00FF66" style={{ paddingVertical: 16 }} />
          ) : !hasNextPage && sessions.length > 0 ? (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: '#888888',
                textAlign: 'center',
                paddingVertical: 16,
              }}
            >
              All sessions loaded
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="time-outline" size={40} color="#444444" />}
            title="No sessions yet"
            message="Your workout history will appear here after you complete your first session."
          />
        }
      />
    </SafeAreaView>
  );
}
