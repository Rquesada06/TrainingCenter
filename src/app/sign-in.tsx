/**
 * Sign-in screen — Phase 01 Plan 03
 *
 * Implements AUTH-01, AUTH-02 (sign-in routes to role shell via auth listener)
 * and AUTH-04 (password reset via plain email — no actionCodeSettings).
 *
 * Design: Obsidian Performance theme (#0E0E0E base, #00FF66 accent, Hanken Grotesk)
 *
 * Security (T-03-01): zod validates input before any Firebase call.
 * Security (T-03-02): Firebase error codes map to generic messages —
 *   wrong-password and user-not-found share the same "Incorrect email or password."
 *   message to prevent account enumeration. Reset confirmation is also generic.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInValues } from '@/validation/auth.schema';
import { signIn, sendPasswordReset } from '@/firebase/auth';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// ────────────────────────────────────────────────────────────────────────────
// Firebase error code → readable message mapping (T-03-02: no account enumeration)
// ────────────────────────────────────────────────────────────────────────────

function mapSignInError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      // Combine these — do not reveal whether the account exists (T-03-02)
      return 'Incorrect email or password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────

export default function SignInScreen() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Sign-in handler ────────────────────────────────────────────────────────

  const onSubmit = async (values: SignInValues) => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signIn(values.email, values.password);
      // On success — do nothing here. The Plan 02 onAuthStateChanged listener
      // fires → authStore updates → Stack.Protected re-evaluates and routes
      // the user to their role shell (AUTH-01 / AUTH-02).
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setAuthError(mapSignInError(code));
    } finally {
      setIsSigningIn(false);
    }
  };

  // ── Forgot password handler ────────────────────────────────────────────────

  const onForgotPassword = async () => {
    // Validate the email field alone before making a reset request
    const emailValid = await trigger('email');
    if (!emailValid) {
      // Inline field error from RHF is already shown via the Controller below
      return;
    }

    const email = getValues('email');
    try {
      await sendPasswordReset(email);
      // Generic confirmation — does not reveal whether the account exists (T-03-02)
      setResetStatus('sent');
    } catch {
      setResetStatus('error');
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0E0E0E]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo / brand */}
          <Text className="text-white text-4xl font-bold mb-2 tracking-tight">LauFit</Text>
          <Text className="text-[#888888] text-sm mb-10">
            Sign in to your coaching account
          </Text>

          {/* Dismissible inline error banner */}
          {authError ? (
            <TouchableOpacity
              onPress={() => setAuthError(null)}
              className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 mb-6"
              accessibilityRole="alert"
            >
              <Text className="text-red-400 text-sm">{authError}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Reset confirmation banner */}
          {resetStatus === 'sent' ? (
            <View className="bg-[#1A1A1A] border border-[#444444] rounded-lg px-4 py-3 mb-6">
              <Text className="text-[#888888] text-sm">
                If that email exists, a reset link has been sent.
              </Text>
            </View>
          ) : null}

          {/* Email field */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextField
                label="Email"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            )}
          />

          {/* Password field */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextField
                label="Password"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                secureTextEntry
                textContentType="password"
              />
            )}
          />

          {/* Primary CTA */}
          <PrimaryButton
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isSigningIn}
          />

          {/* Forgot password — secondary action */}
          <TouchableOpacity
            onPress={onForgotPassword}
            className="mt-4 items-center py-2"
            accessibilityRole="button"
          >
            <Text className="text-[#888888] text-sm">Forgot password?</Text>
          </TouchableOpacity>

          {/* Reset error state */}
          {resetStatus === 'error' ? (
            <View className="mt-2 items-center">
              <Text className="text-red-400 text-xs">
                Could not send reset email. Please try again.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
