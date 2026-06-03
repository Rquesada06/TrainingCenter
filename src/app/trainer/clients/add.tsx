/**
 * Add Client screen — Phase 02 Plan 03 (surfaces Phase 1 createClientAccount CF)
 *
 * Trainer enters a name, email, and temporary password to create a new client account.
 * Calls the createClientAccount Cloud Function (deployed in Phase 1 Plan 04).
 * On success: invalidates the clients query + navigates back to the client list.
 *
 * Security: the Cloud Function sets trainerId server-side from context.auth.uid —
 * the trainer cannot forge a different trainerId via this form (T-02-04 mitigation, Phase 1).
 */

import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { createClientSchema, type CreateClientValues } from '@/validation/createClient.schema';
import { createClientAccountCallable } from '@/firebase/functions';
import { useAuthStore } from '@/stores/authStore';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export default function AddClientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trainerId = useAuthStore((s) => s.uid);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      email: '',
      temporaryPassword: '',
    },
  });

  const onSubmit = async (values: CreateClientValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createClientAccountCallable({
        name: values.name,
        email: values.email,
        temporaryPassword: values.temporaryPassword,
      });
      // Invalidate clients list so the new client appears immediately
      queryClient.invalidateQueries({ queryKey: ['clients', trainerId] });
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create client — please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back + title */}
        <View style={{ marginTop: 16, marginBottom: 8 }}>
          <PrimaryButton label="← Back" variant="outline" onPress={() => router.back()} />
        </View>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 24,
          }}
        >
          Add Client
        </Text>

        {/* Form */}
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Full Name"
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
              autoCapitalize="words"
              textContentType="name"
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Email"
              value={value}
              onChangeText={onChange}
              error={errors.email?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          )}
        />

        <Controller
          control={control}
          name="temporaryPassword"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="Temporary Password"
              value={value}
              onChangeText={onChange}
              error={errors.temporaryPassword?.message}
              secureTextEntry
              textContentType="newPassword"
            />
          )}
        />

        <PrimaryButton
          label="Create Client"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />

        {submitError ? (
          <Text
            style={{
              color: '#FF4444',
              fontSize: 13,
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            {submitError}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
