/**
 * Firestore write helpers.
 *
 * Firestore rejects any `undefined` field value at any depth with
 * "Unsupported field value: undefined". Optional form fields left blank arrive
 * as `undefined` (zod `.optional()` yields undefined, not null), so they must be
 * stripped before a `.add()` / `.set()` / `.update()` call.
 */

/**
 * Returns a deep copy of `value` with every `undefined`-valued key removed.
 *
 * - Recurses into plain objects and arrays (covers nested shapes like a routine's
 *   `exercises[]` whose items carry optional sets/reps/notes/alternativeId).
 * - Leaves non-plain objects untouched (Date, class instances, and — importantly —
 *   Firestore FieldValue sentinels are never passed here; timestamps are appended
 *   by the service after stripping, so they are never mangled).
 * - Empty strings and `null` are preserved; only `undefined` is dropped.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && (value as object).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}
