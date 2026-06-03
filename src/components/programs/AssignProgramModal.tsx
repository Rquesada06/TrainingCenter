/**
 * AssignProgramModal — Two-step flow for assigning a program to a client.
 *
 * Phase 02 Plan 05 (ASGN-01, ASGN-02, ASGN-04)
 *
 * Step flow:
 *   1. pickClient: select a client via ClientPickerSheet
 *   2. pickDate: enter start date in YYYY-MM-DD format (ASGN-04)
 *   3. (optional) confirmOverwrite: if client has active assignment, show warning (ASGN-02)
 *   4. submitting: call createAssignment CF + show ActivityIndicator
 *   5. done: onComplete() called to dismiss
 *
 * The findActiveAssignmentForClient call is the ASGN-02 check that runs client-side
 * BEFORE the Cloud Function. The CF also marks previous active assignments as completed
 * atomically — this is the defense-in-depth double-check.
 *
 * Error handling: withSaveFeedback wraps the mutateAsync call to surface errors as Alerts.
 *
 * Design system: Obsidian Performance
 *   - Background: #0E0E0E
 *   - Surface: #1A1A1A
 *   - Warning text: #FFD600
 *   - Accent: #00FF66
 *   - Muted: #888888
 */

import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { findActiveAssignmentForClient } from '@/services/assignment.service';
import { useCreateAssignment } from '@/hooks/useCreateAssignment';
import { useAuthStore } from '@/stores/authStore';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import { ClientPickerSheet, type ClientPickerSheetHandle } from './ClientPickerSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { User } from '@/types/user';
import type { Assignment } from '@/types/assignment';

type AssignStep =
  | 'pickClient'
  | 'pickDate'
  | 'confirmOverwrite'
  | 'submitting'
  | 'done';

export interface AssignProgramModalProps {
  visible: boolean;
  programId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function todayYMD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function AssignProgramModal({
  visible,
  programId,
  onComplete,
  onCancel,
}: AssignProgramModalProps) {
  const clientPickerRef = useRef<ClientPickerSheetHandle>(null);
  const createAssignment = useCreateAssignment();
  const trainerId = useAuthStore((s) => s.uid);

  const [step, setStep] = useState<AssignStep>('pickClient');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [startDate, setStartDate] = useState<string>(todayYMD());
  const [existingAssignment, setExistingAssignment] = useState<Assignment | null>(null);
  const [dateError, setDateError] = useState<string>('');

  // Reset state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setStep('pickClient');
      setSelectedClient(null);
      setStartDate(todayYMD());
      setExistingAssignment(null);
      setDateError('');
    }
  }, [visible]);

  const handleClientSelect = (client: User) => {
    setSelectedClient(client);
    setStep('pickDate');
  };

  const handleContinue = async () => {
    if (!DATE_REGEX.test(startDate)) {
      setDateError('Date must be in YYYY-MM-DD format');
      return;
    }
    setDateError('');

    if (!selectedClient || !trainerId) return;

    // ASGN-02: check for existing active assignment before calling CF.
    // Wrapped so a query failure surfaces as an Alert instead of an uncaught
    // promise rejection that crashes the modal.
    await withSaveFeedback(
      async () => {
        const existing = await findActiveAssignmentForClient(selectedClient.uid, trainerId);
        if (existing) {
          setExistingAssignment(existing);
          setStep('confirmOverwrite');
        } else {
          await submitAssignment();
        }
      },
      () => {},
      'Could not check existing assignments',
    );
  };

  const submitAssignment = async () => {
    if (!selectedClient) return;
    setStep('submitting');

    await withSaveFeedback(
      () =>
        createAssignment.mutateAsync({
          programId,
          clientId: selectedClient.uid,
          startDate,
        }),
      () => {
        setStep('done');
        onComplete();
      },
      'Assignment failed'
    );

    // If withSaveFeedback surfaced an error (Alert shown), allow retry
    if (step === 'submitting') {
      setStep('confirmOverwrite');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      {/*
        A React Native <Modal> creates a separate native view hierarchy. The
        @gorhom BottomSheetModal (ClientPickerSheet) portals to the nearest
        BottomSheetModalProvider — without one INSIDE this Modal it renders at
        the app root, behind the Modal ("button does nothing"). Provide a local
        GestureHandlerRootView + BottomSheetModalProvider so the sheet appears.
      */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ flex: 1, padding: 24 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
              Assign Program
            </Text>
            <Pressable onPress={onCancel}>
              <Text style={{ color: '#888888', fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </View>

          {/* Step: pickClient */}
          {step === 'pickClient' && (
            <View>
              <Text style={{ color: '#888888', fontSize: 14, marginBottom: 16 }}>
                Select a client to assign this program to.
              </Text>
              <PrimaryButton
                label="Choose client"
                onPress={() => clientPickerRef.current?.present()}
              />
            </View>
          )}

          {/* Step: pickDate */}
          {step === 'pickDate' && selectedClient && (
            <View>
              <Text style={{ color: '#888888', fontSize: 14, marginBottom: 8 }}>
                Client: <Text style={{ color: '#FFFFFF' }}>{selectedClient.name}</Text>
              </Text>
              <Text style={{ color: '#888888', fontSize: 14, marginBottom: 8 }}>
                Start date (YYYY-MM-DD)
              </Text>
              <TextInput
                value={startDate}
                onChangeText={(t) => {
                  setStartDate(t);
                  setDateError('');
                }}
                placeholder="2026-06-01"
                placeholderTextColor="#444444"
                style={{
                  backgroundColor: '#1A1A1A',
                  borderWidth: 1,
                  borderColor: dateError ? '#EF4444' : '#444444',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: '#FFFFFF',
                  fontSize: 16,
                  marginBottom: 4,
                }}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
              {dateError ? (
                <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
                  {dateError}
                </Text>
              ) : null}
              <View style={{ marginTop: 16 }}>
                <PrimaryButton
                  label="Continue"
                  onPress={handleContinue}
                  disabled={!DATE_REGEX.test(startDate)}
                />
              </View>
            </View>
          )}

          {/* Step: confirmOverwrite (ASGN-02) */}
          {step === 'confirmOverwrite' && selectedClient && existingAssignment && (
            <View>
              <View
                style={{
                  backgroundColor: '#1A1A1A',
                  borderWidth: 1,
                  borderColor: '#FFD600',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <Text style={{ color: '#FFD600', fontSize: 14, lineHeight: 20 }}>
                  {`${selectedClient.name} already has an active program: `}
                  <Text style={{ fontWeight: '700' }}>
                    {existingAssignment.snapshot?.name ?? 'Unknown Program'}
                  </Text>
                  {'. Assigning will mark the current program as completed. Continue?'}
                </Text>
              </View>
              <PrimaryButton
                label="Overwrite"
                onPress={submitAssignment}
              />
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  onPress={onCancel}
                />
              </View>
            </View>
          )}

          {/* Step: submitting */}
          {step === 'submitting' && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator color="#00FF66" size="large" />
              <Text style={{ color: '#888888', fontSize: 14, marginTop: 16 }}>
                Creating assignment...
              </Text>
            </View>
          )}
        </View>

        {/* ClientPickerSheet — rendered inside the local BottomSheetModalProvider */}
        <ClientPickerSheet ref={clientPickerRef} onSelect={handleClientSelect} />
      </SafeAreaView>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
