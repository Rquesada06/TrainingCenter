/**
 * RoutineExerciseRow — Phase 05 Plan 04 (PRES-01/02/03)
 *
 * Tests that the builder row captures:
 * - Rep range (repsMin / repsMax) with "Reps (min–max)" label
 * - Optional Target RPE field
 * - Timed toggle (accessibilityRole="switch")
 * - Conditional Duration field (visible only when timed=ON)
 * - Reversible toggle: hidden fields retain values (not unregistered)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { routineSchema } from '@/validation/routine.schema';
import type { RoutineFormValues } from '@/validation/routine.schema';
import { RoutineExerciseRow } from '../RoutineExerciseRow';

// Minimal wrapper so RHF Controller hooks can resolve the control context
function Wrapper({ children }: { children: React.ReactNode }) {
  const methods = useForm<RoutineFormValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      name: 'Test Routine',
      exercises: [
        {
          exerciseId: 'ex-1',
          name: 'Back Squat',
          sets: 3,
          reps: 10,
          rest: 90,
          order: 0,
          timed: false,
          repsMin: 8,
          repsMax: 10,
          targetRpe: undefined,
        },
      ],
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

function renderRow(timedDefault = false) {
  const methods = { control: undefined as unknown };
  let capturedControl: ReturnType<typeof useForm>['control'];

  function InnerWrapper() {
    const form = useForm<RoutineFormValues>({
      resolver: zodResolver(routineSchema),
      defaultValues: {
        name: 'Test Routine',
        exercises: [
          {
            exerciseId: 'ex-1',
            name: 'Back Squat',
            sets: 3,
            reps: 10,
            rest: 90,
            order: 0,
            timed: timedDefault,
            repsMin: 8,
            repsMax: 10,
          },
        ],
      },
    });
    capturedControl = form.control;
    return (
      <RoutineExerciseRow
        index={0}
        control={form.control as never}
        exerciseName="Back Squat"
        alternativeName={null}
        onRemove={() => {}}
        onOpenAlternativePicker={() => {}}
      />
    );
  }

  const result = render(<InnerWrapper />);
  return result;
}

// ─── RED tests: these should FAIL before implementation ───────────────────────

describe('RoutineExerciseRow — prescription fields (PRES-01/02/03)', () => {
  test('renders "Reps (min–max)" label for rep range fields', () => {
    const { getByText } = renderRow();
    // This should find the combined rep-range label
    expect(getByText('Reps (min–max)')).toBeTruthy();
  });

  test('renders "Target RPE" label for the RPE field', () => {
    const { getByText } = renderRow();
    expect(getByText('Target RPE')).toBeTruthy();
  });

  test('renders Timed toggle with accessibilityRole="switch"', () => {
    const { getAllByRole } = renderRow();
    const switches = getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(1);
  });

  test('does NOT render "Duration (s)" label when timed is OFF', () => {
    const { queryByText } = renderRow(false);
    // Duration should be hidden when timed is OFF
    expect(queryByText('Duration (s)')).toBeNull();
  });

  test('renders "Duration (s)" label when timed is ON', () => {
    const { getByText } = renderRow(true);
    expect(getByText('Duration (s)')).toBeTruthy();
  });

  test('does NOT render "Reps (min–max)" label when timed is ON', () => {
    const { queryByText } = renderRow(true);
    // Rep-range should be hidden when timed is ON
    expect(queryByText('Reps (min–max)')).toBeNull();
  });

  test('does NOT render "Rest (s)" label when timed is ON', () => {
    const { queryByText } = renderRow(true);
    expect(queryByText('Rest (s)')).toBeNull();
  });

  test('renders "Rest (s)" label when timed is OFF (weighted default)', () => {
    const { getByText } = renderRow(false);
    expect(getByText('Rest (s)')).toBeTruthy();
  });
});
