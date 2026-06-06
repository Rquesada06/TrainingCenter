/**
 * RestTimerBar + WorkTimerControl component tests — Phase 05 Plan 05 (TIMR-01/02)
 *
 * Verifies the structural and behavioral contracts for the two timer components:
 *   - RestTimerBar: presentational inline bar (no endsAt/keep-awake/alarm logic)
 *   - WorkTimerControl: timed exercise Start pill + running row + done chip
 *
 * RED phase — these tests will fail until the components are implemented.
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0, top: 0, left: 0, right: 0 })),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RestTimerBar } from '../RestTimerBar';
import { WorkTimerControl } from '../WorkTimerControl';

// ─────────────────────────────────────────────────────────────────────────────
// RestTimerBar
// ─────────────────────────────────────────────────────────────────────────────

describe('RestTimerBar — structure', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <RestTimerBar
          remainingMs={60_000}
          totalMs={90_000}
          onSkip={jest.fn()}
          onAdd15={jest.fn()}
        />
      )
    ).not.toThrow();
  });

  it('displays "Rest" label', () => {
    const { getByText } = render(
      <RestTimerBar
        remainingMs={60_000}
        totalMs={90_000}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('Rest')).toBeTruthy();
  });

  it('displays "Skip" control', () => {
    const { getByText } = render(
      <RestTimerBar
        remainingMs={60_000}
        totalMs={90_000}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('Skip')).toBeTruthy();
  });

  it('displays "+15s" control', () => {
    const { getByText } = render(
      <RestTimerBar
        remainingMs={60_000}
        totalMs={90_000}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('+15s')).toBeTruthy();
  });

  it('calls onSkip when Skip is pressed', () => {
    const onSkip = jest.fn();
    const { getByText } = render(
      <RestTimerBar
        remainingMs={60_000}
        totalMs={90_000}
        onSkip={onSkip}
        onAdd15={jest.fn()}
      />
    );
    fireEvent.press(getByText('Skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onAdd15 when +15s is pressed', () => {
    const onAdd15 = jest.fn();
    const { getByText } = render(
      <RestTimerBar
        remainingMs={60_000}
        totalMs={90_000}
        onSkip={jest.fn()}
        onAdd15={onAdd15}
      />
    );
    fireEvent.press(getByText('+15s'));
    expect(onAdd15).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole timer', () => {
    const { UNSAFE_getByProps } = render(
      <RestTimerBar
        remainingMs={60_000}
        totalMs={90_000}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(UNSAFE_getByProps({ accessibilityRole: 'timer' })).toBeTruthy();
  });

  it('displays countdown time in mm:ss format', () => {
    const { getByText } = render(
      <RestTimerBar
        remainingMs={90_000}
        totalMs={90_000}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    // 90s = 1:30
    expect(getByText('1:30')).toBeTruthy();
  });

  it('does NOT import or use endsAt / activateKeepAwake (presentational only)', () => {
    // Acceptance criterion: RestTimerBar.tsx should not contain
    // the keep-awake or alarm logic — it only renders props
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../RestTimerBar.tsx'),
      'utf8'
    );
    expect(source).not.toContain('activateKeepAwake');
    expect(source).not.toContain('endsAt');
    expect(source).toContain('onAdd15');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkTimerControl
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkTimerControl — idle state', () => {
  it('renders Start pill in idle state', () => {
    const { getByText } = render(
      <WorkTimerControl
        durationSec={60}
        state="idle"
        remainingMs={0}
        onStart={jest.fn()}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('Start 60s')).toBeTruthy();
  });

  it('calls onStart when Start is pressed', () => {
    const onStart = jest.fn();
    const { getByText } = render(
      <WorkTimerControl
        durationSec={60}
        state="idle"
        remainingMs={0}
        onStart={onStart}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    fireEvent.press(getByText('Start 60s'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('WorkTimerControl — running state', () => {
  it('shows Skip and +15s controls while running', () => {
    const { getByText } = render(
      <WorkTimerControl
        durationSec={60}
        state="running"
        remainingMs={45_000}
        onStart={jest.fn()}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('Skip')).toBeTruthy();
    expect(getByText('+15s')).toBeTruthy();
  });

  it('calls onSkip when Skip pressed while running', () => {
    const onSkip = jest.fn();
    const { getByText } = render(
      <WorkTimerControl
        durationSec={60}
        state="running"
        remainingMs={45_000}
        onStart={jest.fn()}
        onSkip={onSkip}
        onAdd15={jest.fn()}
      />
    );
    fireEvent.press(getByText('Skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows countdown mm:ss while running', () => {
    const { getByText } = render(
      <WorkTimerControl
        durationSec={60}
        state="running"
        remainingMs={45_000}
        onStart={jest.fn()}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('0:45')).toBeTruthy();
  });
});

describe('WorkTimerControl — done state', () => {
  it('shows Done chip when state is done', () => {
    const { getByText } = render(
      <WorkTimerControl
        durationSec={60}
        state="done"
        remainingMs={0}
        onStart={jest.fn()}
        onSkip={jest.fn()}
        onAdd15={jest.fn()}
      />
    );
    expect(getByText('Done')).toBeTruthy();
  });

  it('contains onStart prop (acceptance criteria)', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../WorkTimerControl.tsx'),
      'utf8'
    );
    expect(source).toContain('onStart');
  });
});
