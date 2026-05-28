/**
 * useAuth hook — Phase 01 Plan 02
 *
 * Re-exports the useAuth convenience hook from authStore for ergonomic
 * component imports. Components import from @/hooks/useAuth rather than
 * reaching into @/stores/authStore directly.
 *
 * Usage:
 *   import { useAuth } from '@/hooks/useAuth';
 *   const { uid, role, isLoaded } = useAuth();
 */

export { useAuth } from '@/stores/authStore';
