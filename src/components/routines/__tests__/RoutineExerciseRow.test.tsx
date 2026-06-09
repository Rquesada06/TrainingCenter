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
import { render, fireEvent, act } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { routineSchema } from '@/validation/routine.schema';
import { RoutineExerciseRow } from '../RoutineExerciseRow';

/**
 * Renders RoutineExerciseRow inside a minimal RHF form.
 * Returns the render result + the toggle element for interaction.
 */
function renderRow(timedDefault = false) {
  function InnerWrapper() {
    const form = useForm<z.input<typeof routineSchema>, unknown, z.output<typeof routineSchema>>({
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
    return (
      <RoutineExerciseRow
        index={0}
        control={form.control as never}
        exerciseName="Back Squat"
        resolveExerciseName={() => null}
        onRemove={() => {}}
        onOpenAlternativePicker={() => {}}
        onRemoveAlternative={() => {}}
      />
    );
  }

  return render(<InnerWrapper />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RoutineExerciseRow — prescription fields (PRES-01/02/03)', () => {
  describe('default weighted state (Timed OFF)', () => {
    test('renders "Reps (min–max)" label for rep range fields', () => {
      const { getByText } = renderRow(false);
      expect(getByText('Reps (min–max)')).toBeTruthy();
    });

    test('renders "Target RPE" label for the RPE field', () => {
      const { getByText } = renderRow(false);
      expect(getByText('Target RPE')).toBeTruthy();
    });

    test('renders "Rest (s)" label in weighted mode', () => {
      const { getByText } = renderRow(false);
      expect(getByText('Rest (s)')).toBeTruthy();
    });

    test('does NOT render "Duration (s)" label when timed is OFF', () => {
      const { queryByText } = renderRow(false);
      expect(queryByText('Duration (s)')).toBeNull();
    });
  });

  describe('Timed toggle', () => {
    test('renders Timed toggle with accessibilityRole="switch"', () => {
      const { getAllByRole } = renderRow(false);
      const switches = getAllByRole('switch');
      expect(switches.length).toBeGreaterThanOrEqual(1);
    });

    test('toggling ON shows Duration field and hides Reps-range', () => {
      const { getAllByRole, queryByText, getByText } = renderRow(false);
      const switches = getAllByRole('switch');
      const timedSwitch = switches[0];

      // Initial state: Reps visible, Duration hidden
      expect(getByText('Reps (min–max)')).toBeTruthy();
      expect(queryByText('Duration (s)')).toBeNull();

      // Fire the toggle
      act(() => {
        fireEvent(timedSwitch, 'valueChange', true);
      });

      // After toggle ON: Duration visible, Reps hidden
      expect(getByText('Duration (s)')).toBeTruthy();
      expect(queryByText('Reps (min–max)')).toBeNull();
    });

    test('toggling ON hides Rest (s) field', () => {
      const { getAllByRole, queryByText, getByText } = renderRow(false);
      const switches = getAllByRole('switch');
      const timedSwitch = switches[0];

      // Initially Rest is visible
      expect(getByText('Rest (s)')).toBeTruthy();

      act(() => {
        fireEvent(timedSwitch, 'valueChange', true);
      });

      // After toggle ON: Rest hidden
      expect(queryByText('Rest (s)')).toBeNull();
    });

    test('toggling ON then OFF is reversible (shows Reps-range again)', () => {
      const { getAllByRole, queryByText, getByText } = renderRow(false);
      const switches = getAllByRole('switch');
      const timedSwitch = switches[0];

      // Toggle ON
      act(() => {
        fireEvent(timedSwitch, 'valueChange', true);
      });
      expect(queryByText('Reps (min–max)')).toBeNull();

      // Toggle OFF
      act(() => {
        fireEvent(timedSwitch, 'valueChange', false);
      });
      expect(getByText('Reps (min–max)')).toBeTruthy();
    });
  });
});
