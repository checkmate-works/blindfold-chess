/**
 * Standard result type for server actions.
 * @template T Additional fields to include on success (e.g., `{ id: string }`)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ActionResult<T extends Record<string, unknown> = {}> =
  | ({ success: true } & T)
  | { error: string };
