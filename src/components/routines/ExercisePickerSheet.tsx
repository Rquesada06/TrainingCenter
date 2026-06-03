/**
 * ExercisePickerSheet — Multi-select exercise picker bottom sheet.
 *
 * Phase 02 Plan 04 (ROUT-01)
 *
 * Uses @gorhom/bottom-sheet BottomSheetModal with BottomSheetFlatList.
 * Exposes present() via forwardRef + useImperativeHandle so the parent
 * (RoutineBuilder) can open it imperatively.
 *
 * Multi-select: tap a row to toggle selection; "Confirm" calls onSelect
 * with the selected Exercise[] and dismisses the sheet.
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExercises } from '@/hooks/useExercises';
import type { Exercise } from '@/types/exercise';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export interface ExercisePickerSheetProps {
  onSelect: (exercises: Exercise[]) => void;
}

export type ExercisePickerSheetRef = Pick<BottomSheetModalMethods, 'present' | 'dismiss'>;

const SNAP_POINTS = ['92%'];

const renderBackdrop = (props: BottomSheetDefaultBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

export const ExercisePickerSheet = forwardRef<ExercisePickerSheetRef, ExercisePickerSheetProps>(
  function ExercisePickerSheet({ onSelect }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const exercisesQuery = useExercises();
    const exercises = exercisesQuery.data ?? [];

    useImperativeHandle(ref, () => ({
      present: () => {
        setSelectedIds(new Set());
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const toggleSelection = (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    const handleConfirm = () => {
      const selected = exercises.filter((ex) => selectedIds.has(ex.id));
      onSelect(selected);
      sheetRef.current?.dismiss();
    };

    const renderItem = ({ item }: { item: Exercise }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <Pressable
          onPress={() => toggleSelection(item.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A',
          }}
        >
          {/* Check indicator */}
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: isSelected ? '#00FF66' : '#555555',
              backgroundColor: isSelected ? '#00FF66' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {isSelected ? (
              <Text style={{ color: '#0E0E0E', fontSize: 14, fontWeight: '700' }}>✓</Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15 }} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {item.category}  •  {item.locationTypes.join(' · ')}
            </Text>
          </View>
        </Pressable>
      );
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        bottomInset={insets.bottom}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#1A1A1A' }}
        handleIndicatorStyle={{ backgroundColor: '#555555' }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
            Select Exercises
          </Text>
          <View style={{ width: 140 }}>
            <PrimaryButton
              label={`Confirm (${selectedIds.size})`}
              onPress={handleConfirm}
              disabled={selectedIds.size === 0}
            />
          </View>
        </View>

        {/* Exercise list */}
        {exercisesQuery.isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#888888' }}>Loading exercises…</Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ color: '#888888', textAlign: 'center' }}>
              No exercises yet — create some in the Exercises tab first.
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
  }
);
