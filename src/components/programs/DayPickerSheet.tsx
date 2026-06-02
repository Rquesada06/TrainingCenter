/**
 * DayPickerSheet — Bottom sheet picker for assigning a routine or rest to a program day.
 *
 * Phase 02 Plan 05 (PROG-02, PROG-03, PROG-04)
 *
 * Exposed imperatively via forwardRef + useImperativeHandle:
 *   `ref.current?.present(weekIndex, dayIndex)` — same pattern as ExercisePickerSheet.
 *
 * Uses @gorhom/bottom-sheet (already installed, mounted at root via Plan 02-04).
 * Populates the routine list via useRoutines().
 *
 * onSelect choices:
 *   - string (routineId) → assign that routine to the day
 *   - 'rest' → mark the day as explicit rest
 *   - null → unassign (clears to null)
 *
 * Design system: Obsidian Performance
 *   - Background: #1A1A1A
 *   - Border: #444444
 *   - Text: #FFFFFF
 *   - REST label: #888888
 *   - Unassigned label: #888888
 *   - Routine item: #FFFFFF
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useRoutines } from '@/hooks/useRoutines';
import type { Routine } from '@/types/routine';

export interface DayPickerSheetHandle {
  present: (weekIndex: number, dayIndex: number) => void;
}

export interface DayPickerSheetProps {
  onSelect: (weekIndex: number, dayIndex: number, choice: string | 'rest' | null) => void;
}

const SNAP_POINTS = ['60%'];

export const DayPickerSheet = forwardRef<DayPickerSheetHandle, DayPickerSheetProps>(
  ({ onSelect }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [activeCell, setActiveCell] = useState<{ w: number; d: number } | null>(null);
    const { data: routines = [] } = useRoutines();

    useImperativeHandle(ref, () => ({
      present: (weekIndex: number, dayIndex: number) => {
        setActiveCell({ w: weekIndex, d: dayIndex });
        sheetRef.current?.present();
      },
    }));

    const dismiss = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleSelect = useCallback(
      (choice: string | 'rest' | null) => {
        if (activeCell) {
          onSelect(activeCell.w, activeCell.d, choice);
        }
        dismiss();
      },
      [activeCell, onSelect, dismiss]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const renderItem = useCallback(
      ({ item }: { item: Routine }) => (
        <Pressable
          onPress={() => handleSelect(item.id)}
          style={{
            backgroundColor: '#1A1A1A',
            borderBottomWidth: 1,
            borderBottomColor: '#444444',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15 }}>{item.name}</Text>
        </Pressable>
      ),
      [handleSelect]
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#1A1A1A' }}
        handleIndicatorStyle={{ backgroundColor: '#444444' }}
      >
        {/* Header */}
        {activeCell ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#444444',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
              {`Week ${activeCell.w + 1}, Day ${activeCell.d + 1}`}
            </Text>
          </View>
        ) : null}

        {/* Mark as Rest */}
        <Pressable
          onPress={() => handleSelect('rest')}
          style={{
            backgroundColor: '#1A1A1A',
            borderBottomWidth: 1,
            borderBottomColor: '#444444',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: '#888888', fontSize: 15 }}>Mark as Rest</Text>
        </Pressable>

        {/* Unassigned */}
        <Pressable
          onPress={() => handleSelect(null)}
          style={{
            backgroundColor: '#1A1A1A',
            borderBottomWidth: 1,
            borderBottomColor: '#444444',
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: '#888888', fontSize: 15 }}>Unassigned</Text>
        </Pressable>

        {/* Routine list */}
        <BottomSheetFlatList
          data={routines}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#888888', fontSize: 14 }}>
                No routines yet — create one in the Routines tab first.
              </Text>
            </View>
          }
        />
      </BottomSheetModal>
    );
  }
);

DayPickerSheet.displayName = 'DayPickerSheet';
