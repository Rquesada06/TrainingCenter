/**
 * FinishButton — Always-tappable finish CTA with confirm-if-incomplete.
 * Phase 03 Plan 04 (WORK-06, D-13)
 *
 * - If all exercises are checked: calls onFinish directly.
 * - If 1+ exercises unchecked: shows Alert.alert confirm dialog first.
 * - Disabled + loading while isPending (WORK-06 double-tap guard / T-03-10).
 *
 * Wraps PrimaryButton so the visual style is identical to the rest of the app.
 */

import React from 'react';
import { Alert } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export interface FinishButtonProps {
  completedCount: number;
  totalExercises: number;
  isPending: boolean;
  onFinish: () => void;
}

export function FinishButton({
  completedCount,
  totalExercises,
  isPending,
  onFinish,
}: FinishButtonProps) {
  const handlePress = () => {
    if (completedCount === totalExercises) {
      // All done — finish immediately, no confirmation needed
      onFinish();
    } else {
      // Some exercises unchecked — ask for confirmation (D-13)
      Alert.alert(
        'Finish workout?',
        `You've completed ${completedCount} of ${totalExercises} exercises. Save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish', style: 'default', onPress: onFinish },
        ]
      );
    }
  };

  return (
    <PrimaryButton
      label="Finish Workout"
      onPress={handlePress}
      loading={isPending}
      disabled={isPending}
    />
  );
}
