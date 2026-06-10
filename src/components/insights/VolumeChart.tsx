/**
 * VolumeChart — volume-trend line chart (Phase 6, INST-02 / COAV-02).
 *
 * Renders Σ weight×reps over time via react-native-gifted-charts (react-native-svg).
 * NOTE: react-native-svg is a NATIVE module — requires a dev-client rebuild before
 * it renders on device. Returns null for <2 points (no trend to draw).
 */

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { VolumePoint } from '@/lib/insights';

/** "2026-06-08" → "6/8" */
function shortDate(d: string): string {
  const parts = d.split('-');
  return parts.length === 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : d;
}

export function VolumeChart({
  points,
  title,
}: {
  points: VolumePoint[];
  title?: string;
}) {
  if (points.length < 2) return null;

  const data = points.map((p) => ({ value: p.volume, label: shortDate(p.date) }));
  const chartWidth = Dimensions.get('window').width - 96;

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
      {title ? (
        <Text style={{ fontSize: 14, color: '#888888', marginBottom: 12 }}>{title}</Text>
      ) : null}
      <LineChart
        data={data}
        width={chartWidth}
        height={160}
        thickness={2}
        color="#00FF66"
        dataPointsColor="#00FF66"
        curved
        areaChart
        startFillColor="#00FF66"
        endFillColor="#00FF66"
        startOpacity={0.25}
        endOpacity={0.02}
        initialSpacing={8}
        yAxisColor="#2A2A2A"
        xAxisColor="#2A2A2A"
        rulesColor="#2A2A2A"
        yAxisTextStyle={{ color: '#888888', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#888888', fontSize: 9 }}
        noOfSections={3}
      />
    </View>
  );
}
