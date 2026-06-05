/**
 * RoutineExerciseRow — One exercise entry in the routine builder.
 *
 * Phase 02 Plan 04 (ROUT-02, ROUT-03, ROUT-05)
 * Phase 05 Plan 04 (PRES-01/02/03) — rep range, target RPE, Timed toggle
 *
 * Renders:
 * - Exercise name header + drag handle + remove button
 * - Timed toggle (D-11): ON → Sets + Duration(s); OFF → Sets + Reps(min–max) + Target RPE + Rest(s)
 * - Hidden fields RETAIN their RHF values when toggled (reversible — D-11)
 * - Notes field (ROUT-03)
 * - Alternative exercise selector (ROUT-05)
 *
 * Uses RHF Controller for all fields so values stay in the form state.
 * Numeric Controller convention (verbatim):
 *   value={String(field.value ?? '')}
 *   onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
 *   keyboardType="number-pad"
 *   error={fieldState.error?.message}
 */

import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Controller, type Control, useWatch } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import type { RoutineFormValues } from '@/validation/routine.schema';

export interface RoutineExerciseRowProps {
  index: number;
  control: Control<RoutineFormValues>;
  exerciseName: string;
  alternativeName: string | null;
  onRemove: () => void;
  onOpenAlternativePicker: () => void;
  dragHandle?: React.ReactNode;
}

export function RoutineExerciseRow({
  index,
  control,
  exerciseName,
  alternativeName,
  onRemove,
  onOpenAlternativePicker,
  dragHandle,
}: RoutineExerciseRowProps) {
  // Watch the timed field for this exercise to drive conditional rendering.
  // useWatch subscribes to a single field — no re-render on other field changes.
  const isTimed = useWatch({
    control,
    name: `exercises.${index}.timed`,
    defaultValue: false,
  });

  return (
    <View
      style={{
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
      }}
    >
      {/* Header row: name + drag handle + remove */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text
          style={{ flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}
          numberOfLines={1}
        >
          {exerciseName}
        </Text>
        {dragHandle ? (
          <View style={{ marginRight: 8 }}>{dragHandle}</View>
        ) : null}
        <Pressable
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Remove exercise"
        >
          <Text style={{ color: '#888888', fontSize: 18, fontWeight: '400' }}>×</Text>
        </Pressable>
      </View>

      {/* Timed toggle — D-11 explicit boolean, never inferred from field presence */}
      <Controller
        name={`exercises.${index}.timed`}
        control={control}
        render={({ field }) => {
          const checked = !!field.value;
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: '#888888', fontSize: 14, marginRight: 8 }}
              >
                Timed
              </Text>
              <Switch
                value={checked}
                onValueChange={(v) => field.onChange(v)}
                trackColor={{ false: '#444444', true: '#00FF66' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#444444"
                accessibilityRole="switch"
                accessibilityState={{ checked }}
                accessibilityLabel="Timed exercise toggle"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
              {/* Timed badge — shown when toggle is ON (UI-SPEC B2, #FFD600) */}
              {checked ? (
                <View
                  style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: '#FFD600',
                    backgroundColor: 'rgba(255,214,0,0.2)',
                  }}
                >
                  <Text
                    style={{ color: '#FFD600', fontSize: 12, fontWeight: '400' }}
                  >
                    Timed
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {/* ── WEIGHTED fields (Timed OFF) ─────────────────────────────────────── */}
      {!isTimed ? (
        <>
          {/* Row 1: Sets + Reps (min–max) + Target RPE */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 0 }}>
            {/* Sets */}
            <View style={{ flex: 1 }}>
              <Controller
                name={`exercises.${index}.sets`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    label="Sets"
                    value={String(field.value ?? '')}
                    onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                    keyboardType="number-pad"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>

            {/* Rep range — two fields with en-dash separator */}
            <View style={{ flex: 2 }}>
              <Text
                style={{
                  color: '#888888',
                  fontSize: 14,
                  marginBottom: 4,
                  fontWeight: '400',
                }}
              >
                Reps (min–max)
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    name={`exercises.${index}.repsMin`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label=""
                        value={String(field.value ?? '')}
                        onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                        keyboardType="number-pad"
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
                <Text
                  style={{
                    color: '#888888',
                    fontSize: 16,
                    fontWeight: '400',
                    paddingBottom: 4,
                  }}
                >
                  –
                </Text>
                <View style={{ flex: 1 }}>
                  <Controller
                    name={`exercises.${index}.repsMax`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label=""
                        value={String(field.value ?? '')}
                        onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                        keyboardType="number-pad"
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
              </View>
            </View>

            {/* Target RPE (optional) */}
            <View style={{ flex: 1 }}>
              <Controller
                name={`exercises.${index}.targetRpe`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    label="Target RPE"
                    value={String(field.value ?? '')}
                    onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                    keyboardType="number-pad"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </View>

          {/* Row 2: Rest (s) */}
          <View style={{ marginTop: 8 }}>
            <Controller
              name={`exercises.${index}.rest`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  label="Rest (s)"
                  value={String(field.value ?? '')}
                  onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                  keyboardType="number-pad"
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </>
      ) : null}

      {/* ── TIMED fields (Timed ON) ──────────────────────────────────────────── */}
      {isTimed ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Sets */}
          <View style={{ flex: 1 }}>
            <Controller
              name={`exercises.${index}.sets`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  label="Sets"
                  value={String(field.value ?? '')}
                  onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                  keyboardType="number-pad"
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          {/* Duration (s) */}
          <View style={{ flex: 2 }}>
            <Controller
              name={`exercises.${index}.duration`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  label="Duration (s)"
                  value={String(field.value ?? '')}
                  onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                  keyboardType="number-pad"
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>
      ) : null}

      {/* Notes field — ROUT-03 */}
      <View style={{ marginTop: 8 }}>
        <Controller
          name={`exercises.${index}.notes`}
          control={control}
          render={({ field }) => (
            <TextField
              label="Notes"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              placeholder="Optional — e.g. slow eccentric"
              multiline
            />
          )}
        />
      </View>

      {/* Alternative exercise — ROUT-05 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: '#888888', fontSize: 13, marginRight: 8 }}>Alt:</Text>
        <Pressable onPress={onOpenAlternativePicker}>
          <Text
            style={{
              color: alternativeName ? '#00FF66' : '#888888',
              fontSize: 13,
              textDecorationLine: alternativeName ? 'none' : 'underline',
            }}
          >
            {alternativeName ?? '+ Add alternative'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
