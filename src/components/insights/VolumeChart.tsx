/**
 * VolumeChart — volume-trend line chart (Phase 6, INST-02 / COAV-02).
 *
 * Drawn directly with react-native-svg (no react-native-gifted-charts — its barrel
 * pulls in components whose linear-gradient wrapper throws at import when neither
 * react-native-linear-gradient nor expo-linear-gradient is installed). react-native-svg
 * is a NATIVE module — already in the dev-client rebuild. Returns null for <2 points.
 */

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import type { VolumePoint } from '@/lib/insights';

/** "2026-06-08" → "6/8" */
function shortDate(d: string): string {
  const parts = d.split('-');
  return parts.length === 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : d;
}

const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 22;
const HEIGHT = 172;

export function VolumeChart({
  points,
  title,
}: {
  points: VolumePoint[];
  title?: string;
}) {
  if (points.length < 2) return null;

  const width = Dimensions.get('window').width - 96;
  const plotW = width - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;

  const vals = points.map((p) => p.volume);
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals, 0);
  const range = maxV - minV || 1;

  const x = (i: number) => PAD_L + (i / (points.length - 1)) * plotW;
  const y = (v: number) => PAD_T + plotH - ((v - minV) / range) * plotH;

  const polyPoints = points.map((p, i) => `${x(i)},${y(p.volume)}`).join(' ');

  // First / middle / last x-axis labels (avoid crowding).
  const labelIdx = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])
  );

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
        <Text style={{ fontSize: 14, color: '#888888', marginBottom: 8 }}>{title}</Text>
      ) : null}
      <Svg width={width} height={HEIGHT}>
        {/* baseline */}
        <Line
          x1={PAD_L}
          y1={PAD_T + plotH}
          x2={PAD_L + plotW}
          y2={PAD_T + plotH}
          stroke="#2A2A2A"
          strokeWidth={1}
        />
        {/* trend line */}
        <Polyline points={polyPoints} fill="none" stroke="#00FF66" strokeWidth={2} />
        {/* data points */}
        {points.map((p, i) => (
          <Circle key={`pt${i}`} cx={x(i)} cy={y(p.volume)} r={3} fill="#00FF66" />
        ))}
        {/* peak value label */}
        <SvgText x={PAD_L} y={PAD_T - 2} fill="#888888" fontSize={9}>
          {`${Math.round(maxV)} kg`}
        </SvgText>
        {/* x-axis date labels */}
        {labelIdx.map((i) => (
          <SvgText
            key={`lbl${i}`}
            x={x(i)}
            y={HEIGHT - 6}
            fill="#888888"
            fontSize={9}
            textAnchor="middle"
          >
            {shortDate(points[i].date)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
