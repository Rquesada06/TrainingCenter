/**
 * ClientPickerSheet — Bottom sheet to pick a client for program assignment.
 *
 * Phase 02 Plan 05 (ASGN-01)
 *
 * Exposed imperatively via forwardRef + useImperativeHandle:
 *   `ref.current?.present()` — same pattern as DayPickerSheet/ExercisePickerSheet.
 *
 * Uses useClients() for the trainer's client list.
 * Tap a row → onSelect(client) + dismiss the sheet.
 *
 * Design system: Obsidian Performance
 *   - Background: #1A1A1A
 *   - Text: #FFFFFF
 *   - Border: #444444
 *   - Avatar: ClientPhoto component
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClients } from '@/hooks/useClients';
import { ClientPhoto } from '@/components/clients/ClientPhoto';
import type { User } from '@/types/user';

export interface ClientPickerSheetHandle {
  present: () => void;
}

export interface ClientPickerSheetProps {
  onSelect: (client: User) => void;
}

const SNAP_POINTS = ['92%'];

export const ClientPickerSheet = forwardRef<ClientPickerSheetHandle, ClientPickerSheetProps>(
  ({ onSelect }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();
    const { data: clients = [] } = useClients();

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present();
      },
    }));

    const dismiss = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleSelect = useCallback(
      (client: User) => {
        onSelect(client);
        dismiss();
      },
      [onSelect, dismiss]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const renderItem = useCallback(
      ({ item }: { item: User }) => (
        <Pressable
          onPress={() => handleSelect(item)}
          style={{
            backgroundColor: '#1A1A1A',
            borderBottomWidth: 1,
            borderBottomColor: '#444444',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <ClientPhoto
            photoURL={item.photoURL as string | null | undefined}
            name={item.name}
            size={40}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>
              {item.name}
            </Text>
            <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>
              {item.email}
            </Text>
          </View>
        </Pressable>
      ),
      [handleSelect]
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        bottomInset={insets.bottom}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#1A1A1A' }}
        handleIndicatorStyle={{ backgroundColor: '#444444' }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#444444',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
            Select a client
          </Text>
        </View>

        <BottomSheetFlatList
          data={clients}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#888888', fontSize: 14 }}>
                No clients yet — add one in the Clients tab first.
              </Text>
            </View>
          }
        />
      </BottomSheetModal>
    );
  }
);

ClientPickerSheet.displayName = 'ClientPickerSheet';
