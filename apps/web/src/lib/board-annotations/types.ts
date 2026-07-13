import type { Square } from '@blindfold-chess/types';

export const ANNOTATION_COLORS = ['green', 'red', 'yellow', 'blue'] as const;
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

export type Arrow = {
  from: Square;
  to: Square;
  color: AnnotationColor;
};

export type Circle = {
  square: Square;
  color: AnnotationColor;
};

/**
 * Display-only board annotations (drawn over a FEN-rendered board).
 *
 * Persisted as JSONB inline on tables that own a single board to annotate
 * (`chunks.annotations`, `glossary_term_positions.annotations`). The shape is
 * deliberately a value object — there is no separate identity for an arrow
 * or circle, no audit trail, no per-element timestamps. Editing replaces the
 * whole object. Deleting the parent row deletes the annotations with it.
 *
 * The color set is fixed to the four lichess defaults (green/red/yellow/blue)
 * to keep the editor UI bounded and to match the `%cal` / `%csl` PGN
 * comment convention used as the de-facto interchange format. Conversion
 * helpers between this shape and `%cal` / `%csl` strings live in
 * `./pgn-codec.ts`.
 */
export type BoardAnnotations = {
  arrows: Arrow[];
  circles: Circle[];
};

export const EMPTY_BOARD_ANNOTATIONS: BoardAnnotations = Object.freeze({
  arrows: Object.freeze([]) as unknown as Arrow[],
  circles: Object.freeze([]) as unknown as Circle[],
}) as BoardAnnotations;

/**
 * Nothing is drawn. Note this is a value check, not identity — a set that was
 * emptied by removing its last mark is not the {@link EMPTY_BOARD_ANNOTATIONS}
 * singleton but is still empty.
 */
export function isEmptyBoardAnnotations(annotations: BoardAnnotations): boolean {
  return annotations.arrows.length === 0 && annotations.circles.length === 0;
}
