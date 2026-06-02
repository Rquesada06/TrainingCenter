/**
 * ProgramMetaForm — React Hook Form + Zod v4 for program metadata.
 *
 * Phase 02 Plan 05 (PROG-01)
 *
 * Fields: name, description (optional), durationWeeks (1-26 cap per Pitfall 6).
 * Mirrors the exercise/routine form pattern from Plan 02-02/02-04.
 *
 * Design system: Obsidian Performance
 *   - Background: #0E0E0E
 *   - Surface: #1A1A1A
 *   - Label/muted: #888888
 *   - Accent: #00FF66
 */

import React from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { programSchema, type ProgramFormValues } from '@/validation/program.schema';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// Explicit typing per Pitfall 4 (Zod v4 + RHF): use three-generic form to prevent
// type mismatch between input (coerced string) and output (number) for durationWeeks.
type ProgramFormInput = z.input<typeof programSchema>;
type ProgramFormOutput = z.output<typeof programSchema>;

export interface ProgramMetaFormProps {
  defaultValues?: Partial<ProgramFormValues>;
  onSubmit: (values: ProgramFormOutput) => Promise<void>;
  submitLabel: string;
  submitting?: boolean;
}

export function ProgramMetaForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submitting = false,
}: ProgramMetaFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProgramFormInput, unknown, ProgramFormOutput>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      // durationWeeks stored as number; coerce.number() handles string input
      durationWeeks: (defaultValues?.durationWeeks ?? 4) as unknown as string,
    },
  });

  return (
    <View>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Program name"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. 5-Day Strength Block"
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Description (optional)"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="Brief overview of the program"
            multiline
            numberOfLines={3}
            error={errors.description?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="durationWeeks"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="Duration (weeks, 1–26)"
            value={String(value ?? '')}
            onChangeText={onChange}
            keyboardType="number-pad"
            placeholder="4"
            error={errors.durationWeeks?.message}
          />
        )}
      />

      <PrimaryButton
        label={submitLabel}
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
      />
    </View>
  );
}
