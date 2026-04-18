/**
 * Shared types for the `positions` domain layer.
 *
 * Keeps route-independent type definitions used by both the public
 * position-memory practice routes and the admin management pages.
 */

/** Known values of `positions.type`. */
export type PositionType = 'memory' | 'puzzle' | 'sequence';

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
