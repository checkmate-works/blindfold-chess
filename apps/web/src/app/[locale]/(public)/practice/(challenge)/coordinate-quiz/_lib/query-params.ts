import { BOARD_ORIENTATIONS, type BoardOrientation } from './types';

/**
 * The board orientation a link to the challenge setup screen asks it to open
 * with, or `undefined` when the `orientation` parameter is missing or invalid
 * — in which case the player's stored setting is left alone.
 */
export function parseOrientationSeed(raw: unknown): BoardOrientation | undefined {
  return typeof raw === 'string' && (BOARD_ORIENTATIONS as readonly string[]).includes(raw)
    ? (raw as BoardOrientation)
    : undefined;
}
