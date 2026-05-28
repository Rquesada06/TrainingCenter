---
phase: 01-infrastructure-auth
reviewed: 2026-05-28
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/stores/authStore.ts
  - src/firebase/auth.ts
  - src/firebase/firestore.ts
  - src/app/_layout.tsx
  - src/app/sign-in.tsx
  - src/validation/auth.schema.ts
  - src/components/ui/TextField.tsx
  - src/components/ui/PrimaryButton.tsx
  - src/firebase/functions.ts
  - src/services/user.service.ts
  - functions/src/index.ts
  - firestore.rules
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-28
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 1 establishes the authentication pipeline: Firebase auth listener → Zustand authStore → expo-router Stack.Protected guards, plus a Cloud Function to create client accounts. The overall architecture is sound and most security hygiene is good (anti-enumeration, zod pre-validation, no secrets in source). Three issues require fixes before this ships: an app-stalling Firestore error in the auth listener, a privilege-escalation gap in Firestore rules, and a misleading error code masking real failures in the Cloud Function.

---

## Critical Issues

### CR-01: Firestore error in auth listener permanently stalls the splash screen

**File:** `src/firebase/auth.ts:40-48`

The `onAuthStateChanged` callback is `async` and performs a Firestore read with no error handling. If the read throws (network timeout, permission denied, Firestore unavailable), the exception is swallowed by the Firebase listener harness and `isLoaded` is never set to `true`. The root layout returns `null` indefinitely — the native splash screen never hides and the app is unrecoverable until restarted.

**Fix:**
```typescript
export function initAuthListener(): () => void {
  return auth().onAuthStateChanged(async (firebaseUser) => {
    if (!firebaseUser) {
      useAuthStore.getState().clear();
      return;
    }

    try {
      const snap = await firestore().collection('users').doc(firebaseUser.uid).get();
      const data = snap.data() as { role?: string; trainerId?: string } | undefined;

      useAuthStore.getState().set({
        uid: firebaseUser.uid,
        role: (data?.role as 'trainer' | 'client') ?? null,
        trainerId: data?.trainerId ?? null,
        isLoaded: true,
      });
    } catch {
      // Firestore unavailable — mark as loaded with uid but null role.
      // The role guards in _layout.tsx will route the user to sign-in,
      // which is safer than leaving them on a blank splash screen.
      useAuthStore.getState().set({
        uid: firebaseUser.uid,
        role: null,
        trainerId: null,
        isLoaded: true,
      });
    }
  });
}
```

---

### CR-02: Firestore rule allows a trainer to create or overwrite ANY user document

**File:** `firestore.rules:49`

```
allow create: if isTrainer();
```

This rule is not scoped to the document being created. An authenticated trainer can:
- Write a `users/{any-uid}` document with `role: 'trainer'` for a uid they control, creating a second trainer account outside the Cloud Function path.
- Overwrite another trainer's Firestore document if they know the target uid (since `allow create` applies to any `userId` path parameter).

The Admin SDK path (Cloud Function) bypasses rules correctly, but this rule opens a direct-client-SDK escalation path.

**Fix:** Constrain the create rule to enforce the expected structure:
```javascript
// Trainers can only create docs for other users (not themselves)
// and must set role:'client' with themselves as the trainer.
allow create: if isTrainer()
  && request.resource.data.role == 'client'
  && request.resource.data.trainerId == request.auth.uid
  && userId != request.auth.uid;
```

---

### CR-03: Cloud Function maps all auth.createUser() failures to 'already-exists'

**File:** `functions/src/index.ts:80-86`

The catch block around `admin.auth().createUser()` unconditionally re-throws every error as `HttpsError('already-exists', ...)`. A weak password, invalid email format, or network failure all surface to the trainer UI as "account already exists" — which is factually wrong and will cause trainers to stop retrying valid operations.

**Fix:** Check the error code and map to the appropriate HttpsError:
```typescript
} catch (err: unknown) {
  const firebaseError = err as { code: string; message: string };
  if (firebaseError.code === 'auth/email-already-exists') {
    throw new functions.https.HttpsError('already-exists', 'An account with that email already exists.');
  }
  if (firebaseError.code === 'auth/invalid-password') {
    throw new functions.https.HttpsError('invalid-argument', 'The temporary password does not meet Firebase requirements (min 6 chars).');
  }
  // Generic fallback for network/unexpected errors
  throw new functions.https.HttpsError('internal', 'Could not create user account. Please try again.');
}
```

---

## Warnings

### WR-01: Authenticated user with null role is routed to a blank screen

**File:** `src/app/_layout.tsx:58-70`

When a signed-in user has `role === null` (Firestore read failed, document missing, or unexpected role value), none of the three `Stack.Protected` guards match:
- `!uid` is `false` (user is signed in)
- `uid !== null && role === 'trainer'` is `false`
- `uid !== null && role === 'client'` is `false`

expo-router has no matching screen and renders a blank view. This is the steady-state after CR-01 is partially fixed but the real bug is the missing fallback route.

**Fix:** Add an explicit fallback screen for the `role === null` + signed-in case, or sign out automatically:
```tsx
{/* Fallback: signed in but role unresolved — show error/retry screen */}
<Stack.Protected guard={uid !== null && role === null}>
  <Stack.Screen name="role-error" />
</Stack.Protected>
```
Or, in the auth listener, sign the user out if the Firestore doc is missing and role cannot be determined.

---

### WR-02: Firestore rules for exercises/routines/programs deny all creates

**File:** `firestore.rules:67-71` (same pattern repeated at lines 74-77, 80-83)

```javascript
allow read, write: if isTrainer() && resource.data.trainerId == request.auth.uid;
allow create: if isTrainer() && request.resource.data.trainerId == request.auth.uid;
```

`allow write` covers create, update, and delete. For a create operation, `resource` refers to the non-existent document — accessing `resource.data.trainerId` on a non-existent document causes a rules evaluation error, which Firebase treats as `false`. The `allow create` on the next line is unreachable because `write` already matched the operation. The net effect is that creates are denied in practice.

**Fix:** Split `write` into `update, delete` so `resource.data` is only accessed when the document exists:
```javascript
match /exercises/{exerciseId} {
  allow create: if isTrainer()
    && request.resource.data.trainerId == request.auth.uid;
  allow read, update, delete: if isTrainer()
    && resource.data.trainerId == request.auth.uid;
}
```
Apply the same fix to `routines` and `programs`.

---

### WR-03: authStore.set() action exposes isLoaded to external callers

**File:** `src/stores/authStore.ts:34,49`

The `set` action accepts `Partial<Omit<AuthState, 'set' | 'clear'>>`, which includes `isLoaded`. Any caller — including future developers — can call `useAuthStore.getState().set({ isLoaded: false })` and re-trigger the splash screen guard after the app is running. The `isLoaded` field should only be settable via the dedicated `set` and `clear` methods on the store's own internal logic, not freely via the partial-update action.

**Fix:** Exclude `isLoaded` from the partial update type:
```typescript
set: (state: Partial<Omit<AuthState, 'set' | 'clear' | 'isLoaded'>>) => void;
```
Set `isLoaded: true` explicitly inside the `set` action implementation after the partial merge, so it is always coerced to `true` on any successful sign-in update.

---

### WR-04: No server-side input validation in createClientAccount

**File:** `functions/src/index.ts:50-78`

`data.name`, `data.email`, and `data.temporaryPassword` are passed directly to Firebase Admin SDK with no length or format checks. While Firebase Auth validates email and password at the SDK level, `data.name` is written to Firestore as `displayName` and into the `users` doc without any validation. A trainer (or a compromised trainer session) could write an arbitrarily long string or special characters to the `name` field.

**Fix:** Add basic input validation before the Admin SDK call:
```typescript
if (!data.name || data.name.trim().length === 0 || data.name.length > 100) {
  throw new functions.https.HttpsError('invalid-argument', 'Name must be between 1 and 100 characters.');
}
if (!data.email || !data.temporaryPassword) {
  throw new functions.https.HttpsError('invalid-argument', 'email and temporaryPassword are required.');
}
```

---

## Info

### IN-01: _layout.tsx subscribes to the full authStore without a selector

**File:** `src/app/_layout.tsx:29`

```typescript
const { isLoaded, uid, role } = useAuthStore();
```

This subscribes the root layout to every state update in the store, including `trainerId` changes. While the component only uses `isLoaded`, `uid`, and `role`, it will re-render whenever `trainerId` changes. The existing `useAuth()` convenience hook already does the shallow-selected subset correctly.

**Fix:** Use the convenience hook or an explicit selector:
```typescript
const { isLoaded, uid, role } = useAuth();
```

---

### IN-02: Firestore doc Atom-cast loses type safety for role validation

**File:** `src/firebase/auth.ts:41`

```typescript
const data = snap.data() as { role?: string; trainerId?: string } | undefined;
```

The `as` cast bypasses TypeScript's type system. If Firestore returns a document where `role` is a number or boolean (data corruption or schema drift), the cast silently succeeds and sets an invalid role string into the store. The `Stack.Protected` guards would then fail to match any route.

**Fix:** Use a Zod or explicit runtime check to validate the shape before trusting it:
```typescript
const raw = snap.data();
const role = raw?.role === 'trainer' || raw?.role === 'client' ? raw.role : null;
const trainerId = typeof raw?.trainerId === 'string' ? raw.trainerId : null;
```
This replaces the cast with a value-level check and is three lines.

---

_Reviewed: 2026-05-28_
_Reviewer: Claude (adversarial code review)_
_Depth: standard_
