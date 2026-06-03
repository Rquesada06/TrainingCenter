/**
 * AlternativeExercisePicker — Single-select alternative exercise picker bottom sheet.
 *
 * Phase 02 Plan 04 (ROUT-05)
 *
 * Filters out the row's primary exercise from the list so the trainer
 * cannot set an exercise as its own alternative (T-02-XREF).
 *
 * Single-select: tap a row to select and auto-dismiss.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExercises } from '@/hooks/useExercises';
import type { Exercise } from '@/types/exercise';

export interface AlternativeExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  /** ID of the primary exercise to exclude from the list (T-02-XREF) */
  excludeExerciseId?: string;
}

export type AlternativeExercisePickerRef = Pick<BottomSheetModalMethods, 'present' | 'dismiss'>;

const SNAP_POINTS = ['92%'];

const renderBackdrop = (props: BottomSheetDefaultBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

export const AlternativeExercisePicker = forwardRef<
  AlternativeExercisePickerRef,
  AlternativeExercisePickerProps
>(function AlternativeExercisePicker({ onSelect, excludeExerciseId }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const exercisesQuery = useExercises();

  // T-02-XREF: filter out the primary exercise so it can't be its own alternative
  const exercises = (exercisesQuery.data ?? []).filter(
    (ex) => ex.id !== excludeExerciseId
  );

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    sheetRef.current?.dismiss();
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <Pressable
      onPress={() => handleSelect(item)}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 15 }} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
        {item.category}  •  {item.locationTypes.join(' · ')}
      </Text>
    </Pressable>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      bottomInset={insets.bottom}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1A1A1A' }}
      handleIndicatorStyle={{ backgroundColor: '#555555' }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2A2A',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
          Select Alternative Exercise
        </Text>
        <Text style={{ color: '#888888', fontSize: 13, marginTop: 4 }}>
          This exercise will be shown as the alternative option
        </Text>
      </View>

      {/* Exercise list */}
      {exercisesQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#888888' }}>Loading exercises…</Text>
        </View>
      ) : exercises.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#888888', textAlign: 'center' }}>
            No other exercises available.
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </BottomSheetModal>
  );
});
