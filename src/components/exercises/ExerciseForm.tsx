/**
 * ExerciseForm — Shared form component for create and edit exercise screens.
 *
 * Phase 02 Plan 02 (EXER-01, EXER-02)
 *
 * Used by:
 *   - src/app/trainer/exercises/new.tsx (create)
 *   - src/app/trainer/exercises/[exerciseId].tsx (edit + delete)
 *
 * Security (T-02-06): exerciseSchema (Zod v4) validates all inputs at the form
 * boundary before any Firestore mutation. Rejects invalid category enum, negative
 * numerics, and malformed URLs.
 *
 * Resolver type (Pitfall 4): `useForm<z.input<typeof exerciseSchema>, any, z.output<typeof exerciseSchema>>`
 * prevents TypeScript overload mismatch with @hookform/resolvers v5.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  exerciseSchema,
  EXERCISE_CATEGORIES,
  LOCATION_TYPES,
} from '@/validation/exercise.schema';
import type { ExerciseFormValues } from '@/validation/exercise.schema';
import type { ExerciseCategory, LocationType } from '@/types/exercise';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────

export interface ExerciseFormProps {
  defaultValues?: Partial<ExerciseFormValues>;
  onSubmit: (values: ExerciseFormValues) => Promise<void>;
  submitLabel: string;
  submitting?: boolean;
  /** If provided, renders a destructive delete button below the submit button (EXER-03 edit screen). */
  onDelete?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Category / LocationType chip styles (Obsidian Performance theme)
// ────────────────────────────────────────────────────────────────────────────

const CHIP_SELECTED = 'bg-[#00FF66]';
const CHIP_SELECTED_TEXT = 'text-[#0E0E0E] font-semibold text-xs';
const CHIP_UNSELECTED = 'bg-[#1A1A1A] border border-[#444444]';
const CHIP_UNSELECTED_TEXT = 'text-white text-xs';

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function ExerciseForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submitting = false,
  onDelete,
}: ExerciseFormProps) {
  // Explicit input/output types per RESEARCH.md Pitfall 4 — avoids resolver
  // TypeScript overload mismatch with @hookform/resolvers v5.
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof exerciseSchema>, unknown, z.output<typeof exerciseSchema>>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      locationTypes: [],
      videoUrl: '',
      imageUrl: '',
      ...defaultValues,
    },
  });

  const watchedCategory = watch('category');
  const watchedLocationTypes = watch('locationTypes') ?? [];

  // ── Category tap handler
  const handleCategorySelect = (cat: ExerciseCategory) => {
    setValue('category', cat, { shouldValidate: true });
  };

  // ── LocationType toggle handler
  const handleLocationTypeToggle = (loc: LocationType) => {
    const current = watchedLocationTypes;
    const next = current.includes(loc)
      ? current.filter((l) => l !== loc)
      : [...current, loc];
    setValue('locationTypes', next, { shouldValidate: true });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0E0E0E' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Name ── */}
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Name *"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="e.g. Back Squat"
              error={errors.name?.message}
            />
          )}
        />

        {/* ── Description ── */}
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Description"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="Optional coaching notes"
              multiline
              numberOfLines={3}
              style={{ minHeight: 72 }}
              error={errors.description?.message}
            />
          )}
        />

        {/* ── Category selector ── */}
        <View className="mb-4">
          <Text className="text-[#888888] text-sm mb-2">Category *</Text>
          <View className="flex-row flex-wrap gap-2">
            {EXERCISE_CATEGORIES.map((cat) => {
              const selected = watchedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => handleCategorySelect(cat)}
                  className={`px-3 py-1.5 rounded-full ${selected ? CHIP_SELECTED : CHIP_UNSELECTED}`}
                >
                  <Text className={selected ? CHIP_SELECTED_TEXT : CHIP_UNSELECTED_TEXT}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.category ? (
            <Text className="text-red-400 text-xs mt-1">{errors.category.message as string}</Text>
          ) : null}
        </View>

        {/* ── LocationType selector ── */}
        <View className="mb-4">
          <Text className="text-[#888888] text-sm mb-2">Location *</Text>
          <View className="flex-row gap-3">
            {LOCATION_TYPES.map((loc) => {
              const selected = watchedLocationTypes.includes(loc);
              return (
                <Pressable
                  key={loc}
                  onPress={() => handleLocationTypeToggle(loc)}
                  className={`px-4 py-2 rounded-lg ${selected ? CHIP_SELECTED : CHIP_UNSELECTED}`}
                >
                  <Text className={selected ? CHIP_SELECTED_TEXT : CHIP_UNSELECTED_TEXT}>
                    {loc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.locationTypes ? (
            <Text className="text-red-400 text-xs mt-1">
              {errors.locationTypes.message as string}
            </Text>
          ) : null}
        </View>

        {/* ── Numeric fields (sets / reps / duration / rest) ── */}
        <View className="flex-row gap-3 mb-0">
          <View className="flex-1">
            <Controller
              control={control}
              name="defaultSets"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Default Sets"
                  value={value !== undefined ? String(value) : ''}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="3"
                  error={errors.defaultSets?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="defaultReps"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Default Reps"
                  value={value !== undefined ? String(value) : ''}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="10"
                  error={errors.defaultReps?.message}
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-3 mb-0">
          <View className="flex-1">
            <Controller
              control={control}
              name="defaultDuration"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Duration (sec)"
                  value={value !== undefined ? String(value) : ''}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="30"
                  error={errors.defaultDuration?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="defaultRest"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Rest (sec)"
                  value={value !== undefined ? String(value) : ''}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="60"
                  error={errors.defaultRest?.message}
                />
              )}
            />
          </View>
        </View>

        {/* ── URL fields (text input only — no video/image preview in Phase 2) ── */}
        <Controller
          control={control}
          name="videoUrl"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Video URL"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="https://youtube.com/..."
              keyboardType="url"
              autoCapitalize="none"
              error={errors.videoUrl?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="imageUrl"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Image URL"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              error={errors.imageUrl?.message}
            />
          )}
        />

        {/* ── Submit ── */}
        <View className="mt-2">
          <PrimaryButton
            label={submitLabel}
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={submitting}
          />
        </View>

        {/* ── Delete (edit screen only — EXER-03) ── */}
        {onDelete ? (
          <View className="mt-3">
            <PrimaryButton
              label="Delete exercise"
              variant="outline"
              onPress={onDelete}
              disabled={submitting}
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
