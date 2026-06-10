/**
 * PRCard — one personal-record card (Phase 6, INST-01 / COAV-02).
 * Per lift: best estimated 1RM (Epley) + heaviest weight, with a NEW badge.
 * Shared by the client Insights tab and the trainer's per-client Insights.
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { ExercisePR } from '@/lib/insights';

export function PRCard({ pr }: { pr: ExercisePR }) {
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
