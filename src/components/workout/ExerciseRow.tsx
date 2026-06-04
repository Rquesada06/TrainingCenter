/**
 * ExerciseRow — Expandable exercise row in the workout session list.
 * Phase 03 Plan 04 (WORK-03/04, D-07/D-10)
 *
 * Collapsed (2B): checkbox + name + sets×reps/duration + optional mode tag + chevron.
 * Expanded (2C): detail grid (Sets/Reps|Duration/Rest) + notes + inline video/image.
 *
 * CRITICAL:
 * - Each row with a videoUrl creates its OWN useVideoPlayer instance (never shared).
 *   Android constraint: shared VideoPlayer is not supported.
 * - VideoView is only mounted while the row is expanded (ensures ≤1 active at a time).
 * - expo-video will red-screen on device until the Plan 05 native rebuild — expected.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { parseYouTubeId } from '@/lib/youtube';
import { YouTubeEmbed } from './YouTubeEmbed';
import type { AssignmentSnapshotExercise } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ExerciseRowProps {
  exercise: AssignmentSnapshotExercise;
  /** null when no mode-tag needed; 'gym_only'/'home_only' per D-10 */
  modeTag: 'gym_only' | 'home_only' | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: inline video (one player per row, Android constraint)
// ─────────────────────────────────────────────────────────────────────────────

interface InlineVideoProps {
  videoUrl: string;
}

function InlineVideo({ videoUrl }: InlineVideoProps) {
  // Each ExerciseRow with a videoUrl gets its OWN useVideoPlayer instance.
  // This is a React rule requirement AND an Android constraint.
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 200, backgroundColor: '#000000' }}
      contentFit="contain"
      nativeControls
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: mode tag pill (D-10)
// ─────────────────────────────────────────────────────────────────────────────

interface ModeTagProps {
  tag: 'gym_only' | 'home_only';
}

function ModeTagPill({ tag }: ModeTagProps) {
  const label = tag === 'gym_only' ? 'gym only' : 'home only';
  return (
    <View
      style={{
        backgroundColor: 'rgba(255, 214, 0, 0.2)',
        borderWidth: 1,
        borderColor: '#FFD600',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 6,
      }}
    >
      <Text style={{ color: '#FFD600', fontSize: 14, fontWeight: '400' }}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ExerciseRow({
  exercise,
  modeTag,
  isCompleted,
  onToggleComplete,
  isExpanded,
  onToggleExpand,
  readOnly = false,
}: ExerciseRowProps) {
  // Derive secondary line: prefer reps if both reps and duration are non-null
  const secondaryLine =
    exercise.reps !== null
      ? `${exercise.sets}×${exercise.reps}`
      : exercise.duration !== null
        ? `${exercise.sets}×${exercise.duration}s`
        : `${exercise.sets} sets`;

  return (
    <View
      style={{
        backgroundColor: '#1A1A1A',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
      }}
      accessibilityState={{ expanded: isExpanded }}
    >
      {/* ── Collapsed header row ── */}
      <Pressable
        onPress={onToggleExpand}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.name}, ${isCompleted ? 'checked' : 'unchecked'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        {/* Checkbox */}
        <Pressable
          onPress={readOnly ? undefined : onToggleComplete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={exercise.name}
          style={{ marginRight: 12 }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: isCompleted ? 0 : 2,
              borderColor: '#444444',
              backgroundColor: isCompleted ? '#00FF66' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCompleted && (
              <Ionicons name="checkmark" size={16} color="#0E0E0E" />
            )}
          </View>
        </Pressable>

        {/* Name + mode tag */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '400',
                color: isCompleted ? '#888888' : '#FFFFFF',
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
            {modeTag !== null && <ModeTagPill tag={modeTag} />}
          </View>
          <Text style={{ fontSize: 14, color: '#888888', marginTop: 2 }}>
            {secondaryLine}
          </Text>
        </View>

        {/* Expand chevron */}
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#444444"
        />
      </Pressable>

      {/* ── Expanded detail section ── */}
      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ paddingHorizontal: 16, paddingBottom: 16 }}
        >
          {/* Detail grid: Sets / Reps|Duration / Rest */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {/* Sets cell */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#0E0E0E',
                borderRadius: 8,
                padding: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, color: '#888888', marginBottom: 2 }}>Sets</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {exercise.sets}
              </Text>
            </View>

            {/* Reps or Duration cell */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#0E0E0E',
                borderRadius: 8,
                padding: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, color: '#888888', marginBottom: 2 }}>
                {exercise.reps !== null ? 'Reps' : 'Duration'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {exercise.reps !== null
                  ? exercise.reps
                  : exercise.duration !== null
                    ? `${exercise.duration}s`
                    : '—'}
              </Text>
            </View>

            {/* Rest cell */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#0E0E0E',
                borderRadius: 8,
                padding: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, color: '#888888', marginBottom: 2 }}>Rest</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {exercise.rest}s
              </Text>
            </View>
          </View>

          {/* Notes — only when non-null */}
          {exercise.notes !== null && (
            <Text style={{ fontSize: 14, color: '#888888', marginTop: 8, marginBottom: 8 }}>
              {exercise.notes}
            </Text>
          )}

          {/* Media (only mounted while expanded): YouTube → embed player;
              direct video file (.mp4/HLS) → expo-video; else → image. */}
          {exercise.videoUrl !== null && parseYouTubeId(exercise.videoUrl) !== null ? (
            <View style={{ marginTop: 8 }}>
              <YouTubeEmbed videoId={parseYouTubeId(exercise.videoUrl)!} />
            </View>
          ) : exercise.videoUrl !== null ? (
            <View style={{ marginTop: 8 }}>
              <InlineVideo videoUrl={exercise.videoUrl} />
            </View>
          ) : exercise.imageUrl !== null ? (
            <View style={{ marginTop: 8 }}>
              <Image
                source={exercise.imageUrl}
                style={{ width: '100%', height: 200 }}
                contentFit="contain"
              />
            </View>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
}
