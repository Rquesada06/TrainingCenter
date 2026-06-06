/**
 * NumberField — numeric TextField that buffers keystrokes in local state.
 *
 * On the New-Architecture (Fabric) build, a fully-controlled numeric TextInput
 * (`value={String(formValue)}`) can re-assert its prop value faster than a
 * keystroke commits to form state — the input "snaps back" so you cannot clear
 * or change it (e.g. delete "10" → "10" reappears). Buffering the visible text
 * locally decouples typing from the controlled re-render: the field shows what
 * you typed, and the parsed number is pushed to the form in parallel. We only
 * re-sync FROM the form when the external value genuinely differs from the
 * current text (seed / reset / reorder), so we never fight the user mid-edit.
 */

import React, { useEffect, useState } from 'react';
import { TextField } from './TextField';
import type { TextFieldProps } from './TextField';

export interface NumberFieldProps
  extends Omit<TextFieldProps, 'value' | 'onChangeText'> {
  /** Current numeric value from form state (null/undefined → empty). */
  value: number | null | undefined;
  /** Called with the parsed number, or undefined when the field is cleared. */
  onChangeNumber: (value: number | undefined) => void;
}

export function NumberField({ value, onChangeNumber, ...rest }: NumberFieldProps) {
  const [text, setText] = useState(value != null ? String(value) : '');

  // Re-sync only when the external value no longer matches what is typed.
  // Comparing parsed numbers avoids echoing our own edits back into the buffer.
  useEffect(() => {
    const typed = text.trim() === '' ? undefined : Number(text);
    const external = value ?? undefined;
    if (typed !== external) {
      setText(value != null ? String(value) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextField
      {...rest}
      value={text}
      keyboardType="number-pad"
      onChangeText={(v) => {
        setText(v);
        const n = v.trim() === '' ? undefined : Number(v);
        onChangeNumber(n != null && !Number.isNaN(n) ? n : undefined);
      }}
    />
  );
}
