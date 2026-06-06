/**
 * SetRow — Per-set logging row inside an expanded weighted exercise card.
 * Phase 05 Plan 03 (LOG-01/LOG-02/D-01/D-02/D-03)
 *
 * Renders the 5-column grid: SET | PESO (KG) | REPS | RPE | STATUS
 * Aligned with the header row via shared flex weights (UI-SPEC A2):
 *   SET 0.9 / PESO 2.6 / REPS 2.0 / RPE 2.2 / STATUS 1.6, gap 8
 *
 * Value color rule (UI-SPEC):
 *   `#888888` when isPrefilled && !completed && !edited (i.e., unconfirmed prefill)
 *   `#FFFFFF` once the client edits or checks the set
 *
 * Done-check: 28×28 circle (adapted from ExerciseRow.tsx:144-159):
 *   - Unchecked: border-2 border-[#444444] transparent fill
 *   - Checked: bg-[#00FF66] + Ionicons checkmark 16px #0E0E0E
 *   - hitSlop → ≥44pt target
 *   - accessibilityRole="checkbox"
 *
 * NO textDecorationLine: 'line-through' — v1.0 strikethrough is dropped (Phase 5).
 * RPE cell opens RpeStepper (not a free keypad, D-01).
 */

import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RpeStepper } from './RpeStepper';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface SetRowProps {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  /** True when the values are from prefill and have not been edited/confirmed */
  isPrefilled: boolean;
  onChangeWeight: (value: number | null) => void;
  onChangeReps: (value: number | null) => void;
  onChangeRpe: (value: number | null) => void;
  onToggleDone: () => void;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Column flex weights (UI-SPEC A2)
// ─────────────────────────────────────────────────────────────────────────────

const COL = {
  set: 0.9,
  peso: 2.6,
  reps: 2.0,
  rpe: 2.2,
  status: 1.6,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Cell styles
// ─────────────────────────────────────────────────────────────────────────────

const CELL_BASE = {
  backgroundColor: '#0E0E0E',
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 8,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: 44,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SetRow({
  setNumber,
  weight,
  reps,
  rpe,
  completed,
  isPrefilled,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onToggleDone,
  readOnly = false,
}: SetRowProps) {
  // Track which numeric cells have been edited by the user
  const [weightEdited, setWeightEdited] = useState(false);
  const [repsEdited, setRepsEdited] = useState(false);

  // Local keystroke buffers for the numeric cells. A fully-controlled numeric
  // TextInput (value={String(weight)}) reverts mid-edit on the New-Architecture
  // build — deleting a value re-asserts it. Buffer the visible text locally and
  // push the parsed number to the store in parallel; re-sync only when the store
  // value genuinely differs (prefill seed / carry-down) so we never fight typing.
  const [weightText, setWeightText] = useState(weight !== null ? String(weight) : '');
  const [repsText, setRepsText] = useState(reps !== null ? String(reps) : '');

  useEffect(() => {
    const typed = weightText.trim() === '' ? null : Number(weightText);
    if (typed !== weight) setWeightText(weight !== null ? String(weight) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weight]);

  useEffect(() => {
    const typed = repsText.trim() === '' ? null : Number(repsText);
    if (typed !== reps) setRepsText(reps !== null ? String(reps) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reps]);

  // Focus state for focused-cell border highlight
  const [weightFocused, setWeightFocused] = useState(false);
  const [repsFocused, setRepsFocused] = useState(false);

  // RPE stepper visibility
  const [showRpeStepper, setShowRpeStepper] = useState(false);

  // Value color rule: muted (#888888) if prefilled + unconfirmed; white otherwise
  const isUnconfirmed = isPrefilled && !completed;
  const weightColor = isUnconfirmed && !weightEdited ? '#888888' : '#FFFFFF';
  const repsColor = isUnconfirmed && !repsEdited ? '#888888' : '#FFFFFF';
  const rpeColor = '#FFFFFF'; // RPE is always user-entered (never prefilled)

  const handleWeightChange = (text: string) => {
    setWeightText(text);
    setWeightEdited(true);
    const parsed = text === '' ? null : parseFloat(text);
    onChangeWeight(parsed !== null && !isNaN(parsed) ? parsed : null);
  };

  const handleRepsChange = (text: string) => {
    setRepsText(text);
    setRepsEdited(true);
    const parsed = text === '' ? null : parseInt(text, 10);
    onChangeReps(parsed !== null && !isNaN(parsed) ? parsed : null);
  };

  // Row container: highlight border when set is completed
  const rowBorderStyle = completed
    ? { borderWidth: 1, borderColor: '#00FF66' }
    : {};

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 8,
          borderRadius: 8,
          overflow: 'hidden',
        },
        rowBorderStyle,
      ]}
    >
      {/* ── SET cell ── */}
      <View style={[CELL_BASE, { flex: COL.set }]}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '400',
            fontFamily: 'JetBrainsMono-Regular',
            color: '#888888',
          }}
        >
          {setNumber}
        </Text>
      </View>

      {/* ── PESO (KG) cell ── */}
      <View
        style={[
          CELL_BASE,
          { flex: COL.peso },
          weightFocused ? { borderWidth: 1, borderColor: '#00FF66' } : {},
        ]}
      >
        <TextInput
          value={weightText}
          onChangeText={handleWeightChange}
          onFocus={() => setWeightFocused(true)}
          onBlur={() => setWeightFocused(false)}
          placeholder="–"
          placeholderTextColor="#444444"
          keyboardType="number-pad"
          editable={!readOnly}
          accessibilityLabel={`Set ${setNumber} weight`}
          style={{
            fontSize: 16,
            fontFamily: 'JetBrainsMono-Regular',
            color: weightColor,
            textAlign: 'center',
            width: '100%',
          }}
        />
      </View>

      {/* ── REPS cell ── */}
      <View
        style={[
          CELL_BASE,
          { flex: COL.reps },
          repsFocused ? { borderWidth: 1, borderColor: '#00FF66' } : {},
        ]}
      >
        <TextInput
          value={repsText}
          onChangeText={handleRepsChange}
          onFocus={() => setRepsFocused(true)}
          onBlur={() => setRepsFocused(false)}
          placeholder="–"
          placeholderTextColor="#444444"
          keyboardType="number-pad"
          editable={!readOnly}
          accessibilityLabel={`Set ${setNumber} reps`}
          style={{
            fontSize: 16,
            fontFamily: 'JetBrainsMono-Regular',
            color: repsColor,
            textAlign: 'center',
            width: '100%',
          }}
        />
      </View>

      {/* ── RPE cell ── tappable, opens RpeStepper inline */}
      <View style={[CELL_BASE, { flex: COL.rpe }]}>
        {showRpeStepper && !readOnly ? (
          <RpeStepper
            value={rpe}
            onChange={(val) => {
              onChangeRpe(val);
              if (val === null) setShowRpeStepper(false);
            }}
          />
        ) : (
          <Pressable
            onPress={() => !readOnly && setShowRpeStepper(true)}
            accessibilityLabel={`Set ${setNumber} RPE`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ alignItems: 'center', justifyContent: 'center', minHeight: 28 }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'JetBrainsMono-Regular',
                color: rpe !== null ? rpeColor : '#444444',
              }}
            >
              {rpe !== null
                ? Number.isInteger(rpe)
                  ? String(rpe)
                  : rpe.toFixed(1)
                : '–'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── STATUS (done-check) cell — adapted from ExerciseRow.tsx:144-159 ── */}
      <View style={[CELL_BASE, { flex: COL.status }]}>
        <Pressable
          onPress={readOnly ? undefined : onToggleDone}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          accessibilityLabel={`Set ${setNumber} done`}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: completed ? 0 : 2,
              borderColor: '#444444',
              backgroundColor: completed ? '#00FF66' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {completed && (
              <Ionicons name="checkmark" size={16} color="#0E0E0E" />
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
