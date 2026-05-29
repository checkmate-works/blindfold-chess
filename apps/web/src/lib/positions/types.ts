/**
 * Shared types for the `positions` domain layer.
 *
 * Keeps route-independent type definitions used by both the public
 * position-memory practice routes and the admin management pages.
 */

/** Known values of `positions.type`. */
export type PositionType = 'memory' | 'puzzle' | 'sequence';

/**
 * Ordering modes for paginated position lists. Mirrors the topic-thread
 * `SortMode` union (new / popular / active) so list pages can reuse the
 * shared `SortSelect` UI and `validateSort` helper:
 * - `new`: `createdAt` DESC (default).
 * - `popular`: like count DESC, then `createdAt` DESC.
 * - `active`: latest comment timestamp DESC (NULLs last), then `createdAt` DESC.
 */
export type PositionSortMode = 'new' | 'popular' | 'active';

const POSITION_TYPES = ['memory', 'puzzle', 'sequence'] as const satisfies readonly PositionType[];

/**
 * Narrow a raw `positions.type` string (as returned by Drizzle) to the
 * `PositionType` union. Returns `null` for values outside the known set so
 * callers can silently drop unknown rows instead of crashing. Under normal
 * conditions every row in `positions.type` is one of the known values; this
 * is purely defensive.
 */
export function parsePositionType(value: string): PositionType | null {
  return (POSITION_TYPES as readonly string[]).includes(value) ? (value as PositionType) : null;
}
