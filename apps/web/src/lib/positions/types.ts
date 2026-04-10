/**
 * Shared types for the `positions` domain layer.
 *
 * Keeps route-independent type definitions used by both the public
 * position-memory practice routes and the admin management pages.
 */
import type { Position } from '@/lib/db';

/** Known values of `positions.type`. */
export type PositionType = 'memory' | 'puzzle' | 'sequence';

/** Full position row. Re-export of the Drizzle inferred type. */
export type PositionRow = Position;

/** Position row joined with (optional) author profile metadata. */
export type PositionWithProfile = {
  position: PositionRow;
  profile: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};
