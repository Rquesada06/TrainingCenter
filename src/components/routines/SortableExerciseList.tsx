/**
 * SortableExerciseList — Drag-and-drop exercise list for the routine builder.
 *
 * Phase 02 Plan 04 (ROUT-04)
 *
 * Wraps `react-native-reanimated-dnd` Sortable + SortableItem with
 * SortableItem.Handle for long-press drag activation.
 *
 * When a drag completes (onDrop), the allPositions map is used to
 * reconstruct the sorted order and call onReorder so the parent
 * (RoutineBuilder) can call RHF's replace() to sync form state.
 *
 * API Note: the library does NOT expose `onOrderChange` on Sortable itself.
 * Order sync is done via `onDrop(id, position, allPositions)` on each SortableItem.
 */

import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Sortable, SortableItem } from 'react-native-reanimated-dnd';
import type { SortableRenderItemProps, SortableData } from 'react-native-reanimated-dnd';

/**
 * Height of one RoutineExerciseRow — used by react-native-reanimated-dnd for layout.
 * Phase 05 added the prescription fields (rep range / target RPE / timed toggle),
 * making the weighted row ~370px. Undersizing this clips the lower fields (Rest /
 * Notes / Alt) and overlaps adjacent rows, intercepting taps. Sized to the tallest
 * (weighted) row. TODO: switch to the lib's dynamic-height mode to avoid gaps on
 * shorter timed rows.
 */
const ITEM_HEIGHT = 430;

/** Minimal field shape required for rendering — exerciseId + RHF id */
export interface SortableField extends SortableData {
  exerciseId: string;
  alternativeExerciseId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface SortableExerciseListProps {
  fields: SortableField[];
  /** Called after a drag ends with the new array of field IDs in order */
  onReorder: (newOrder: string[]) => void;
  /**
   * Render a single row given the field data, its current index in the array,
   * and the drag handle node.
   */
  renderItem: (args: {
    item: SortableField;
    index: number;
    dragHandle: React.ReactNode;
  }) => React.ReactNode;
}

const DragHandleIcon = () => (
  <View
    style={{ paddingHorizontal: 4 }}
    accessibilityLabel="Drag to reorder"
  >
    <Text style={{ color: '#888888', fontSize: 20, lineHeight: 20 }}>☰</Text>
  </View>
);

export function SortableExerciseList({ fields, onReorder, renderItem }: SortableExerciseListProps) {
  const handleDrop = useCallback(
    (
      _id: string,
      _position: number,
      allPositions?: { [id: string]: number }
    ) => {
      if (!allPositions) return;
      // allPositions maps each item id → its current 0-based index in the list.
      // Sort by position value to get the new order as an array of ids.
      const newOrder = Object.entries(allPositions)
        .sort(([, a], [, b]) => a - b)
        .map(([id]) => id);
      onReorder(newOrder);
    },
    [onReorder]
  );

  const renderSortableItem = useCallback(
    (props: SortableRenderItemProps<SortableField>) => {
      const { item, index, id, positions, lowerBound, autoScrollDirection, itemsCount, itemHeight, isDynamicHeight, estimatedItemHeight, itemHeights, scheduleHeightUpdate } = props;
      return (
        <SortableItem
          key={id}
          id={id}
          data={item}
          positions={positions}
          lowerBound={lowerBound}
          autoScrollDirection={autoScrollDirection}
          itemsCount={itemsCount}
          itemHeight={itemHeight}
          isDynamicHeight={isDynamicHeight}
          estimatedItemHeight={estimatedItemHeight}
          itemHeights={itemHeights}
          scheduleHeightUpdate={scheduleHeightUpdate}
          onDrop={handleDrop}
        >
          {renderItem({
            item,
            index,
            dragHandle: (
              <SortableItem.Handle>
                <DragHandleIcon />
              </SortableItem.Handle>
            ),
          })}
        </SortableItem>
      );
    },
    [renderItem, handleDrop]
  );

  if (fields.length === 0) {
    return null;
  }

  return (
    <Sortable
      data={fields}
      renderItem={renderSortableItem}
      itemHeight={ITEM_HEIGHT}
      // Sortable's internal FlatList defaults to a white background; match theme.
      style={{ backgroundColor: '#0E0E0E' }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );
}
