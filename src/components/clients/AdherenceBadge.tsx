/**
 * AdherenceBadge — Threshold-colored adherence percentage label (HIST-04)
 * Phase 04 Plan 03
 *
 * Renders nothing when adherence is null (client not yet started).
 *
 * Color thresholds (text-only, no background fill):
 *   null         → render nothing
 *   0–49%        → #FFD600 (yellow — calm, not red-alarm)
 *   50–79%       → #FFFFFF (white — neutral, factual)
 *   80–100%      → #00FF66 (green — on track)
 *
 * Text format: "{N}% adherence"
 * Accessibility: accessibilityLabel="Adherence: {N} percent"
 *
 * Design system: Obsidian Performance
 */

import React from 'react';
import { View, Text } from 'react-native';

export interface AdherenceBadgeProps {
  adherence: number | null;
}

function getAdherenceColor(adherence: number): string {
  if (adherence < 50) return '#FFD600';
  if (adherence < 80) return '#FFFFFF';
  return '#00FF66';
}

export function AdherenceBadge({ adherence }: AdherenceBadgeProps) {
  if (adherence === null) return null;

  const color = getAdherenceColor(adherence);

  const pct = Math.max(0, Math.min(100, adherence));

  return (
    <View style={{ marginTop: 8 }} accessibilityLabel={`Adherence: ${adherence} percent`}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text
          style={{ fontSize: 11, fontWeight: '600', color: '#888888', letterSpacing: 0.5 }}
        >
          ADHERENCE
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color }}>{adherence}%</Text>
      </View>
      <View
        style={{ height: 6, borderRadius: 3, backgroundColor: '#2A2A2A', overflow: 'hidden' }}
      >
        <View
          style={{ height: 6, borderRadius: 3, width: `${pct}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}
