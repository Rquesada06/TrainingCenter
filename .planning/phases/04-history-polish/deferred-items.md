# Deferred Items — Phase 04 History & Polish

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

## From 04-05 (adherence + EmptyState)

- **Transient typed-route tsc error in `src/app/client/history/index.tsx`** (untracked, owned by 04-04).
  During Task 2 verification a single `tsc` run reported `TS2345` on a `/client/history/${string}`
  router.push path in that file. The file is untracked (`??`) and belongs to a parallel Wave 2 plan
  (04-04 client history). On the next `tsc` run (after expo-router regenerated typed-route declarations)
  the error cleared and full `tsc --noEmit` returned exit 0. No action taken — out of 04-05's file set
  per SCOPE BOUNDARY. Flagged so 04-04's executor/verifier is aware the typed route may need its
  `.expo/types` regenerated if it resurfaces.
