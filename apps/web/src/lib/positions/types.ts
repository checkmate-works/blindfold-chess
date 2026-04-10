/**
 * Shared types for the `positions` domain layer.
 *
 * Keeps route-independent type definitions used by both the public
 * position-memory practice routes and the admin management pages.
 */

/** Known values of `positions.type`. */
export type PositionType = 'memory' | 'puzzle' | 'sequence';
