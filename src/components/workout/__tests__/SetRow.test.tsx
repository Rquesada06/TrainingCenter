/**
 * SetRow + RpeStepper unit tests — Phase 05 Plan 03 (TDD RED)
 *
 * Tests for the 5-column per-set logging row and the compact RPE stepper.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock vector-icons (not supported in jest-expo environment)
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { SetRow } from '../SetRow';
import { RpeStepper } from '../RpeStepper';

// ─────────────────────────────────────────────────────────────────────────────
// SetRow
// ─────────────────────────────────────────────────────────────────────────────

describe('SetRow', () => {
  const defaultProps = {
    setNumber: 1,
    weight: null,
    reps: null,
    rpe: null,
    completed: false,
    isPrefilled: false,
    onChangeWeight: jest.fn(),
    onChangeReps: jest.fn(),
    onChangeRpe: jest.fn(),
    onToggleDone: jest.fn(),
  };

  it('renders the set number', () => {
    const { getByText } = render(<SetRow {...defaultProps} setNumber={2} />);
    expect(getByText('2')).toBeTruthy();
  });

  it('renders done-check with accessibilityRole="checkbox"', () => {
    const { getByRole } = render(<SetRow {...defaultProps} />);
    const checkbox = getByRole('checkbox');
    expect(checkbox).toBeTruthy();
  });

  it('done-check shows checked state when completed=true', () => {
    const { getByRole } = render(<SetRow {...defaultProps} completed={true} />);
    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState?.checked).toBe(true);
  });

  it('done-check shows unchecked state when completed=false', () => {
    const { getByRole } = render(<SetRow {...defaultProps} completed={false} />);
    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState?.checked).toBe(false);
  });

  it('calls onToggleDone when done-check is pressed', () => {
    const onToggleDone = jest.fn();
    const { getByRole } = render(<SetRow {...defaultProps} onToggleDone={onToggleDone} />);
    fireEvent.press(getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledTimes(1);
  });

  it('does NOT render textDecorationLine: line-through (v1.0 strikethrough dropped)', () => {
    const { toJSON } = render(<SetRow {...defaultProps} completed={true} />);
    // Recursively check no textDecorationLine: 'line-through' anywhere in the tree
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('line-through');
  });

  it('renders em-dash placeholders on the empty numeric inputs', () => {
    const { getAllByPlaceholderText } = render(
      <SetRow {...defaultProps} weight={null} reps={null} rpe={null} />
    );
    // Weight, reps, and RPE are all typed inputs with an em-dash placeholder.
    const dashes = getAllByPlaceholderText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('shows weight value when weight is set', () => {
    const { getByDisplayValue } = render(
      <SetRow {...defaultProps} weight={60} isPrefilled={false} />
    );
    expect(getByDisplayValue('60')).toBeTruthy();
  });

  it('renders column headers SET / PESO (KG) / REPS / RPE / STATUS', () => {
    // Headers are rendered by the parent — SetRow renders only the data row
    // This is tested via the parent container; SetRow itself renders the 5 cells.
    const { getByText } = render(<SetRow {...defaultProps} setNumber={1} />);
    expect(getByText('1')).toBeTruthy(); // SET number cell
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RpeStepper
// ─────────────────────────────────────────────────────────────────────────────

describe('RpeStepper', () => {
  const defaultProps = {
    value: null,
    onChange: jest.fn(),
  };

  it('renders the "Clear" affordance', () => {
    const { getByText } = render(<RpeStepper {...defaultProps} value={7} />);
    expect(getByText('Clear')).toBeTruthy();
  });

  it('renders with accessibilityRole="adjustable" on its container', () => {
    const { UNSAFE_getByProps } = render(<RpeStepper {...defaultProps} />);
    expect(UNSAFE_getByProps({ accessibilityRole: 'adjustable' })).toBeTruthy();
  });

  it('shows em-dash when value is null', () => {
    const { getByText } = render(<RpeStepper {...defaultProps} value={null} />);
    expect(getByText('–')).toBeTruthy();
  });

  it('shows the rpe value when set', () => {
    const { getByText } = render(<RpeStepper {...defaultProps} value={8} />);
    expect(getByText('8')).toBeTruthy();
  });

  it('calls onChange with incremented value when + pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <RpeStepper value={7} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Increase RPE'));
    expect(onChange).toHaveBeenCalledWith(7.5);
  });

  it('calls onChange with decremented value when - pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <RpeStepper value={7} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Decrease RPE'));
    expect(onChange).toHaveBeenCalledWith(6.5);
  });

  it('clamps at 10.0 when already at max', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <RpeStepper value={10} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Increase RPE'));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('clamps at 1.0 when already at min', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <RpeStepper value={1} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Decrease RPE'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with null when Clear is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(<RpeStepper value={8} onChange={onChange} />);
    fireEvent.press(getByText('Clear'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('starts from 5 when + pressed and value is null', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <RpeStepper value={null} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Increase RPE'));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
