/**
 * ClientListItem — Single row in the trainer's clients list.
 *
 * Phase 02 Plan 03 (CLNT-02, CLNT-05)
 *
 * Per CLNT-05: when a client has no active program, shows a yellow (#FFD600)
 * dot indicator + "No active program" label.
 *
 * Calls useActiveAssignment(client.uid) per-row in parallel with the list query
 * to display the active program name (or CLNT-05 indicator).
 *
 * Design system: Obsidian Performance theme
 *   - Row bg: #1A1A1A, border: #444
 *   - Active program label: #00FF66 (accent green)
 *   - No-program indicator: #FFD600 (yellow)
 *   - Loading placeholder: #888888
 */

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ClientPhoto } from '@/components/clients/ClientPhoto';
import { useActiveAssignment } from '@/hooks/useActiveAssignment';
import type { User } from '@/types/user';

// ────────────────────────────────────────────────────────────────────────────
// Sub-component: CLNT-05 "No active program" indicator
// ────────────────────────────────────────────────────────────────────────────

function NoProgramIndicator() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#FFD600',
          marginRight: 5,
        }}
      />
      <Text style={{ color: '#FFD600', fontSize: 12 }}>No active program</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ClientListItem
// ────────────────────────────────────────────────────────────────────────────

export interface ClientListItemProps {
  client: User;
  onPress: () => void;
}

export function ClientListItem({ client, onPress }: ClientListItemProps) {
  const activeAssignment = useActiveAssignment(client.uid);

  // Active program label slot
  let programLabel: React.ReactNode;
  if (activeAssignment.isLoading) {
    programLabel = (
      <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>…</Text>
    );
  } else if (activeAssignment.data) {
    programLabel = (
      <Text style={{ color: '#00FF66', fontSize: 12, marginTop: 2 }}>
        {activeAssignment.data.snapshot.name}
      </Text>
    );
  } else {
    programLabel = <NoProgramIndicator />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Avatar */}
      <ClientPhoto photoURL={client.photoURL as string | null | undefined} name={client.name} size={48} />

      {/* Name + program label */}
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          {client.name}
        </Text>
        {programLabel}
      </View>

      {/* Chevron hint */}
      <Text style={{ color: '#444444', fontSize: 18 }}>›</Text>
    </Pressable>
  );
}
