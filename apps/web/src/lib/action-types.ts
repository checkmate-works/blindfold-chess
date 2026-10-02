/**
 * Standard result type for server actions.
 *
 * Callers narrow with `'error' in result`. Actions whose failure codes the
 * client switches on (to pick a translation key, open a specific dialog, …)
 * name them in `E` so the union survives the boundary instead of collapsing
 * to `string`.
 *
 * @template T Additional fields to include on success (e.g., `{ id: string }`)
 * @template E The error codes this action can return; defaults to any string
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ActionResult<T extends Record<string, unknown> = {}, E extends string = string> =
  ({ success: true } & T) | { error: E };
