/**
 * Shared types for the `positions` domain layer.
 *
 * Keeps route-independent type definitions used by both the public
 * position-memory practice routes and the admin management pages.
 */
import type { SortMode } from '@/lib/sort';

/** Known values of `positions.type`. */
export type PositionType = 'memory' | 'puzzle' | 'sequence';

/**
 * Ordering modes for paginated position lists — the shared {@link SortMode},
 * named locally because position queries read better with the noun in the type.
 * What each mode means here:
 * - `new`: `createdAt` DESC (default).
 * - `popular`: like count DESC, then `createdAt` DESC.
 * - `active`: latest comment timestamp DESC (NULLs last), then `createdAt` DESC.
 */
export type PositionSortMode = SortMode;

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
