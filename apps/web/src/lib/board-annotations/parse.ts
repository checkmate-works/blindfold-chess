import type { Square } from '@blindfold-chess/types';

import type { AnnotationColor, Arrow, BoardAnnotations, Circle } from './types';
import { ANNOTATION_COLORS, EMPTY_BOARD_ANNOTATIONS } from './types';

const SQUARE_PATTERN = /^[a-h][1-8]$/;

function isSquare(value: unknown): value is Square {
  return typeof value === 'string' && SQUARE_PATTERN.test(value);
}

function isColor(value: unknown): value is AnnotationColor {
  return typeof value === 'string' && (ANNOTATION_COLORS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseArrow(value: unknown): Arrow | null {
  if (!isRecord(value)) return null;
  const { from, to, color } = value;
  if (!isSquare(from) || !isSquare(to) || !isColor(color)) return null;
  if (from === to) return null;
  return { from, to, color };
}

function parseCircle(value: unknown): Circle | null {
  if (!isRecord(value)) return null;
  const { square, color } = value;
  if (!isSquare(square) || !isColor(color)) return null;
  return { square, color };
}

/**
 * Parse an unknown value (typically a JSONB column read from the DB) into
 * a {@link BoardAnnotations}. Invalid entries are silently dropped rather
 * than throwing: a stale or partially-edited annotation row should still
 * render the rest, not break the whole board.
 *
 * The empty/missing case returns the shared frozen
 * {@link EMPTY_BOARD_ANNOTATIONS} singleton so that callers can use it as
 * a stable prop default for React memoization.
 */
export function parseBoardAnnotations(input: unknown): BoardAnnotations {
  if (input == null) return EMPTY_BOARD_ANNOTATIONS;
  if (!isRecord(input)) return EMPTY_BOARD_ANNOTATIONS;

  const arrowsRaw = input.arrows;
  const circlesRaw = input.circles;

  const arrows = Array.isArray(arrowsRaw)
    ? (arrowsRaw.map(parseArrow).filter((a): a is Arrow => a !== null) as Arrow[])
    : [];
  const circles = Array.isArray(circlesRaw)
    ? (circlesRaw.map(parseCircle).filter((c): c is Circle => c !== null) as Circle[])
    : [];

  if (arrows.length === 0 && circles.length === 0) return EMPTY_BOARD_ANNOTATIONS;
  return { arrows, circles };
}
