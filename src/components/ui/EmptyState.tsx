/**
 * EmptyState — Reusable empty list / no-data state component
 * Phase 04 Plan 03 (D-11 / D-12)
 *
 * Anatomy (UI-SPEC § 7):
 *   decorative icon slot → title → message → optional CTA (PrimaryButton)
 *
 * CTA renders only when both `ctaLabel` and `onCta` are provided (D-12: omit
 * for read-only / derived lists).
 *
 * Design system: Obsidian Performance
 *   - Outer bg: transparent (caller's screen bg)
 *   - Title: #FFFFFF 20px/600
 *   - Message: #888888 14px/400 lineHeight=21
 *   - CTA: PrimaryButton (solid #00FF66)
 */

import React from 'react';
import { View, Text } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export interface EmptyStateProps {
  /** Ionicons element (or any node) — treated as decorative */
  icon: React.ReactNode;
  title: string;
  message: string;
  /** Omit for read-only / derived lists (D-12) */
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, message, ctaLabel, onCta }: EmptyStateProps) {
  const showCta = Boolean(ctaLabel && onCta);

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,   // 2xl token
        paddingHorizontal: 24, // lg token
      }}
    >
      {/* Icon slot — decorative, hidden from accessibility tree */}
      <View
        style={{ marginBottom: 16 }}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </View>

      {/* Title — Heading (20px / 600) */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#FFFFFF',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>

      {/* Message — Label (14px / 400) */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: '400',
          color: '#888888',
          textAlign: 'center',
          lineHeight: 21,
        }}
      >
        {message}
      </Text>

      {/* Optional CTA — only when both ctaLabel and onCta are provided */}
      {showCta && (
        <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
          <PrimaryButton label={ctaLabel!} onPress={onCta!} />
        </View>
      )}
    </View>
  );
}
