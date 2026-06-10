/**
 * ScreenHeader — the StitchUI "eyebrow + title" header (Obsidian Performance).
 *
 * A small green uppercase eyebrow label above a large bold title, with an optional
 * muted subtitle and an optional right-aligned action slot. Matches the design's
 * "PERFORMANCE OVERVIEW / Insights", "MANAGEMENT CONSOLE / Client Roster", etc.
 */

import React from 'react';
import { View, Text, Animated } from 'react-native';

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
  // Soft fade + rise on mount (RN Animated — no reanimated/worklets, jest-safe).
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(8)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        opacity,
        transform: [{ translateY }],
      }}
    >
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
        <Text
          style={{ flex: 1, color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {right ?? null}
      </View>

      {subtitle ? (
        <Text style={{ color: '#888888', fontSize: 14, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}
