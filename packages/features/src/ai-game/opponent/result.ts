/**
 * Minimal `Result<T, E>` type for opponent operations.
 *
 * Domain functions return `Result` instead of throwing when the failure is
 * an *expected* part of the operation (move generation failed, opponent was
 * destroyed mid-request, etc.). The boundary between domain code and React
 * code is the natural place to translate `Result` into thrown exceptions —
 * UI orchestration code (effects, mutations) tends to be easier to read with
 * throws, while the domain layer benefits from exhaustive type-level
 * handling of failure cases.
 *
 * Kept scoped to the opponent module to start. If a second consumer appears
 * in the codebase, this type is a good candidate to promote into
 * `packages/features/src/utils/`.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
