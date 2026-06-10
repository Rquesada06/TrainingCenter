/**
 * ScreenHeader — the StitchUI "eyebrow + title" header (Obsidian Performance).
 *
 * A small green uppercase eyebrow label above a large bold title, with an optional
 * muted subtitle and an optional right-aligned action slot. Matches the design's
 * "PERFORMANCE OVERVIEW / Insights", "MANAGEMENT CONSOLE / Client Roster", etc.
 */

import React from 'react';
import { View, Text } from 'react-native';

export interface ScreenHeaderProps {
  /** Small green uppercase label above the title (e.g. "PERFORMANCE OVERVIEW"). */
  eyebrow?: string;
  title: string;
  /** Optional muted line under the title. */
  subtitle?: string;
  /** Optional right-aligned node (e.g. an icon button), vertically centered on the title row. */
  right?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
      {eyebrow ? (
        <Text
          style={{
            color: '#00FF66',
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: right ? 12 : 0 }}>
          <Text
            style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {right ?? null}
      </View>

      {subtitle ? (
        <Text style={{ color: '#888888', fontSize: 14, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
