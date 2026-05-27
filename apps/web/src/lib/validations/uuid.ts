export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tighter UUID predicate. Equivalent to `UUID_RE.test(value)` but reads as
 * intent when used at the top of a Server Action / DB query for an early
 * return on malformed IDs.
 */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Server Action guard: returns `{ error }` for the typical "bail out on
 * malformed ID" branch, or `null` when the ID looks well-formed. Caller is
 * responsible for proxying the `{ error }` shape to its own return.
 *
 * `field` is the bare camelCase name of the parameter (e.g. `'postId'`,
 * `'chunkId'`, `'positionId'`) — it becomes `invalid<Field>` so callers
 * don't need to template the error key by hand and so the error keys stay
 * consistent across actions.
 *
 * @example
 *   const uuidError = validateUUID(postId, 'postId');
 *   if (uuidError) return uuidError;
 */
export function validateUUID(value: string, field: string): { error: string } | null {
  if (UUID_RE.test(value)) return null;
  return { error: `invalid${field.charAt(0).toUpperCase()}${field.slice(1)}` };
}
